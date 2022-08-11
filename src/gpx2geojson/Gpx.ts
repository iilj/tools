import { assert } from '../lib/utils';
import { FileReaderEx } from '../lib/utils/FileReaderEx';

/** 単一の Gpx ファイルを表すクラス */
export class Gpx {
    private gpxFile?: File;
    /** 緯度，経度，高度 */
    public coordinates: [number, number, number][];
    /** 高度が gpx 内に見つかったか */
    private elevationFound: boolean;

    /** コンストラクタ */
    constructor() {
        this.gpxFile = undefined;
        this.coordinates = [];
        this.elevationFound = true;
    }

    /** gpx ファイルから Gpx インスタンスを初期化する */
    static async fromGpxFile(gpxFile: File) {
        const gpx = new Gpx();
        await gpx.init(gpxFile);
        return gpx;
    }

    /** gpx ファイルを読み込む */
    async init(gpxFile: File) {
        this.gpxFile = gpxFile;

        console.log(`ファイル名: ${gpxFile.name}`);
        const reader = new FileReaderEx();
        const inputGpxString = await reader.readAsText(this.gpxFile);

        assert(typeof inputGpxString === 'string');
        this.initByString(inputGpxString);
    }

    /** gpx 文字列で初期化する */
    initByString(inputGpxString: string) {
        const parser = new DOMParser();
        let dom: Document;
        try {
            dom = parser.parseFromString(inputGpxString, 'application/xml');
        } catch (error) {
            console.error(error);
            throw new Error(
                'gpx の parse に失敗しました．gpx ファイルが正当な xml フォーマットになっていることを確認してください．'
            );
        }

        if (dom.children.length == 0) {
            throw new Error('gpx の 中身が空になっているようです．');
        }

        const gpxNode = dom.children[0];
        if (gpxNode.tagName !== 'gpx') {
            throw new Error(
                `gpx の フォーマットが不正です．DOMParser の返すルートノードが <gpx> ではなく <${gpxNode.tagName}> になっています．`
            );
        }

        // <gpx> の子の <trk> を走査
        for (let i = 0; i < gpxNode.children.length; i++) {
            const trkNode = gpxNode.children[i];
            if (trkNode.tagName !== 'trk') continue;

            // <trk> -> <trkseg> -> <trkpt>...
            for (let j = 0; j < trkNode.children.length; j++) {
                const trksegNode = trkNode.children[j];
                if (trksegNode.tagName !== 'trkseg') continue;

                for (let k = 0; k < trksegNode.children.length; k++) {
                    const trkptNode = trksegNode.children[k];
                    if (trkptNode.tagName !== 'trkpt') continue;

                    const lonString: string | null = trkptNode.getAttribute('lon');
                    const latString: string | null = trkptNode.getAttribute('lat');
                    if (lonString === null || latString === null) continue;
                    const lon = Number(lonString);
                    const lat = Number(latString);
                    if (isNaN(lon) || isNaN(lat)) continue;

                    let ele = 0;
                    const eles = trkptNode.getElementsByTagName('ele');
                    if (eles.length === 0) {
                        this.elevationFound = false;
                    } else {
                        ele = Number(eles[0].textContent);
                        if (isNaN(ele)) {
                            this.elevationFound = false;
                            ele = 0;
                        }
                    }

                    this.coordinates.push([lon, lat, ele]);
                }
            }
        }
    }

    /** GeoJSON 文字列を生成する */
    getGeoJsonString(interval: number, lineColor: string, lineWeight: number) {
        const feature = {
            type: 'Feature',
            properties: {
                _color: lineColor, // '#ff0000',
                _opacity: 1,
                _weight: lineWeight, // 5,
            },
            geometry: {
                type: 'LineString',
                coordinates: this.coordinates.filter((_, index) => index % interval === 0),
            },
        };
        const obj = { type: 'FeatureCollection', features: [feature] };
        const geoJsonString = JSON.stringify(obj);
        return geoJsonString;
    }

    /** kml 文字列を生成する */
    getKmlString(interval: number, lineColor: string, lineWeight: number): string {
        const ns = 'http://www.opengis.net/kml/2.2';

        const xmlDoc: XMLDocument = document.implementation.createDocument(ns, 'kml');
        // https://stackoverflow.com/questions/68801002/add-xml-declaration-to-xml-document-programmatically
        const pi: ProcessingInstruction = xmlDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
        xmlDoc.insertBefore(pi, xmlDoc.firstChild);

        // kml/Document
        const doc = xmlDoc.createElementNS(ns, 'Document');
        xmlDoc.documentElement.appendChild(doc);

        // kml/Document/Name
        const name = xmlDoc.createElementNS(ns, 'Name');
        name.textContent = this.gpxFile?.name || '(unknown)';
        doc.appendChild(name);

        // kml/Document/Style
        // とりあえず，赤線スタイルのみ追加
        const style = xmlDoc.createElementNS(ns, 'Style');
        style.setAttribute('id', 'L1');
        doc.appendChild(style);
        {
            // kml/Document/Style/LineStyle
            const lineStyle = xmlDoc.createElementNS(ns, 'LineStyle');
            style.appendChild(lineStyle);
            const lineStyleColor = xmlDoc.createElementNS(ns, 'color');
            // 透明度、Blue、Green、Redの順
            // 参考: http://dagik.org/kml_intro/line.html
            lineStyleColor.textContent =
                'ff' + lineColor.substring(5, 7) + lineColor.substring(3, 5) + lineColor.substring(1, 3); // 'ff0000ff';
            lineStyle.appendChild(lineStyleColor);
            const lineStyleWidth = xmlDoc.createElementNS(ns, 'width');
            lineStyleWidth.textContent = `${lineWeight}`; // '5';
            lineStyle.appendChild(lineStyleWidth);
        }

        // kml/Document/Placemark
        const placemark = xmlDoc.createElementNS(ns, 'Placemark');
        doc.appendChild(placemark);
        {
            // kml/Document/Placemark/name
            const placemarkName = xmlDoc.createElementNS(ns, 'name');
            placemark.appendChild(placemarkName);

            // kml/Document/Placemark/styleUrl
            const placemarkStyleUrl = xmlDoc.createElementNS(ns, 'styleUrl');
            placemarkStyleUrl.textContent = '#L1';
            placemark.appendChild(placemarkStyleUrl);

            // kml/Document/Placemark/LineString
            const placemarkLineString = xmlDoc.createElementNS(ns, 'LineString');
            placemark.appendChild(placemarkLineString);
            {
                // kml/Document/Placemark/LineString/altitudeMode
                const altitudeMode = xmlDoc.createElementNS(ns, 'altitudeMode');
                // https://developers.google.com/kml/documentation/altitudemode?hl=ja
                altitudeMode.textContent = this.elevationFound ? 'absolute' : 'clampToGround';
                placemarkLineString.appendChild(altitudeMode);

                // kml/Document/Placemark/LineString/coordinates
                const coordinates = xmlDoc.createElementNS(ns, 'coordinates');
                placemarkLineString.appendChild(coordinates);
                coordinates.textContent = this.coordinates.reduce(
                    (prev: string, [lon, lat, ele]: [number, number, number], index: number) => {
                        if (index % interval !== 0) return prev;
                        const app = `${lon},${lat},${this.elevationFound ? ele : 0}`;
                        if (prev.length === 0) return app;
                        prev += ` \n${app}`;
                        return prev;
                    },
                    ''
                );
            }
        }

        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(xmlDoc);

        return xmlString;
    }

    /** 指定された文字列を，指定されたファイル名で保存する（保存ダイアログ表示） */
    private saveFile(content: string, filename: string) {
        const blob = new Blob([content], { type: 'text/plain' });
        const objectURL = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = filename;
        a.href = objectURL;
        a.click();
        a.remove();
        window.setTimeout(() => {
            URL.revokeObjectURL(objectURL);
        }, 1e4);
    }

    /** kml ファイルに保存する */
    saveKmlFile(interval: number, lineColor: string, lineWeight: number) {
        if (this.gpxFile === undefined) return;
        const xmlString = this.getKmlString(interval, lineColor, lineWeight);
        const filename = this.gpxFile.name.split('.')[0] + '.kml';

        this.saveFile(xmlString, filename);
    }

    /** GeoJSON ファイルに保存する */
    saveGeoJsonFile(interval: number, lineColor: string, lineWeight: number) {
        if (this.gpxFile === undefined) return;
        const xgeoJsonString = this.getGeoJsonString(interval, lineColor, lineWeight);
        const filename = this.gpxFile.name.split('.')[0] + '.geojson';

        this.saveFile(xgeoJsonString, filename);
    }
}
