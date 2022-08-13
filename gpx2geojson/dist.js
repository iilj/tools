function assertIsDefined(val, name) {
    if (val === undefined) {
        throw new Error(`Expected '${name}' to be defined, but received undefined`);
    }
    else if (val === null) {
        throw new Error(`Expected '${name}' to be defined, but received null`);
    }
}
function assert(condition, msg) {
    if (!condition) {
        throw new Error(msg ?? 'assertion failed');
    }
}
/** 指定された文字列を，指定されたファイル名で保存する（保存ダイアログ表示） */
const saveFile = (content, filename) => {
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
};

/** await 可能な FileReader */
class FileReaderEx extends FileReader {
    constructor() {
        super();
    }
    /** ファイルを文字列として読み込む．使用例：
     * const reader = new FileReaderEx();
     * const text = await reader.readAsText(fileInputElement.files[0]);
     */
    readAsText(blob) {
        return new Promise((res, rej) => {
            super.addEventListener('load', ({ target }) => res(target?.result));
            super.addEventListener('error', ({ target }) => rej(target?.error));
            super.readAsText(blob);
        });
    }
}

/** 単一の Gpx ファイルを表すクラス */
class Gpx {
    /** コンストラクタ */
    constructor() {
        this.gpxFile = undefined;
        this.coordinates = [];
        this.elevationFound = true;
    }
    /** gpx ファイルから Gpx インスタンスを初期化する */
    static async fromGpxFile(gpxFile) {
        const gpx = new Gpx();
        await gpx.init(gpxFile);
        return gpx;
    }
    /** gpx ファイルを読み込む */
    async init(gpxFile) {
        this.gpxFile = gpxFile;
        console.log(`ファイル名: ${gpxFile.name}`);
        const reader = new FileReaderEx();
        const inputGpxString = await reader.readAsText(this.gpxFile);
        assert(typeof inputGpxString === 'string');
        this.initFromString(inputGpxString);
    }
    /** gpx 文字列で初期化する */
    initFromString(inputGpxString) {
        const parser = new DOMParser();
        let dom;
        try {
            dom = parser.parseFromString(inputGpxString, 'application/xml');
        }
        catch (error) {
            console.error(error);
            throw new Error('gpx の parse に失敗しました．gpx ファイルが正当な xml フォーマットになっていることを確認してください．');
        }
        if (dom.children.length == 0) {
            throw new Error('gpx の 中身が空になっているようです．');
        }
        const gpxNode = dom.children[0];
        if (gpxNode.tagName !== 'gpx') {
            throw new Error(`gpx の フォーマットが不正です．DOMParser の返すルートノードが <gpx> ではなく <${gpxNode.tagName}> になっています．`);
        }
        // <gpx> の子の <trk> を走査
        for (let i = 0; i < gpxNode.children.length; i++) {
            const trkNode = gpxNode.children[i];
            if (trkNode.tagName !== 'trk')
                continue;
            // <trk> -> <trkseg> -> <trkpt>...
            for (let j = 0; j < trkNode.children.length; j++) {
                const trksegNode = trkNode.children[j];
                if (trksegNode.tagName !== 'trkseg')
                    continue;
                for (let k = 0; k < trksegNode.children.length; k++) {
                    const trkptNode = trksegNode.children[k];
                    if (trkptNode.tagName !== 'trkpt')
                        continue;
                    const lonString = trkptNode.getAttribute('lon');
                    const latString = trkptNode.getAttribute('lat');
                    if (lonString === null || latString === null)
                        continue;
                    const lon = Number(lonString);
                    const lat = Number(latString);
                    if (isNaN(lon) || isNaN(lat))
                        continue;
                    let ele = 0;
                    const eles = trkptNode.getElementsByTagName('ele');
                    if (eles.length === 0) {
                        this.elevationFound = false;
                    }
                    else {
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
    getGeoJsonString(interval, lineColor, lineWeight) {
        const feature = {
            type: 'Feature',
            properties: {
                _color: lineColor,
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
    getKmlString(interval, lineColor, lineWeight) {
        const ns = 'http://www.opengis.net/kml/2.2';
        const xmlDoc = document.implementation.createDocument(ns, 'kml');
        // https://stackoverflow.com/questions/68801002/add-xml-declaration-to-xml-document-programmatically
        const pi = xmlDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
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
                coordinates.textContent = this.coordinates.reduce((prev, [lon, lat, ele], index) => {
                    if (index % interval !== 0)
                        return prev;
                    const app = `${lon},${lat},${this.elevationFound ? ele : 0}`;
                    if (prev.length === 0)
                        return app;
                    prev += ` \n${app}`;
                    return prev;
                }, '');
            }
        }
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(xmlDoc);
        return xmlString;
    }
    /** kml ファイルに保存する */
    saveKmlFile(interval, lineColor, lineWeight) {
        if (this.gpxFile === undefined)
            return;
        const xmlString = this.getKmlString(interval, lineColor, lineWeight);
        const filename = this.gpxFile.name.split('.')[0] + '.kml';
        saveFile(xmlString, filename);
    }
    /** GeoJSON ファイルに保存する */
    saveGeoJsonFile(interval, lineColor, lineWeight) {
        if (this.gpxFile === undefined)
            return;
        const geoJsonString = this.getGeoJsonString(interval, lineColor, lineWeight);
        const filename = this.gpxFile.name.split('.')[0] + '.geojson';
        saveFile(geoJsonString, filename);
    }
}

void (() => {
    const fileInputElement = document.getElementById('js-gpx2geojson-input-file');
    assertIsDefined(fileInputElement, 'fileInputElement');
    assert(fileInputElement instanceof HTMLInputElement);
    const lineColorInputElement = document.getElementById('js-gpx2geojson-input-line-color');
    assertIsDefined(lineColorInputElement, 'lineColorInputElement');
    assert(lineColorInputElement instanceof HTMLInputElement);
    const lineWeightInputElement = document.getElementById('js-gpx2geojson-input-line-weight');
    assertIsDefined(lineWeightInputElement, 'lineColorInputElement');
    assert(lineWeightInputElement instanceof HTMLInputElement);
    const maxLengthInputElement = document.getElementById('js-gpx2geojson-input-coordinates-max-length');
    assertIsDefined(maxLengthInputElement, 'maxLengthInputElement');
    assert(maxLengthInputElement instanceof HTMLInputElement);
    const intervalInputElement = document.getElementById('js-gpx2geojson-input-interval');
    assertIsDefined(intervalInputElement, 'intervalInputElement');
    assert(intervalInputElement instanceof HTMLInputElement);
    const lengthInputElement = document.getElementById('js-gpx2geojson-input-coordinates-length');
    assertIsDefined(lengthInputElement, 'lengthInputElement');
    assert(lengthInputElement instanceof HTMLInputElement);
    const lengthSaveInputElement = document.getElementById('js-gpx2geojson-input-coordinates-length-save');
    assertIsDefined(lengthSaveInputElement, 'lengthSaveInputElement');
    assert(lengthSaveInputElement instanceof HTMLInputElement);
    const saveAsGeoJsonbuttonElement = document.getElementById('js-gpx2geojson-save-as-geojson');
    assertIsDefined(saveAsGeoJsonbuttonElement, 'saveAsGeoJsonbuttonElement');
    assert(saveAsGeoJsonbuttonElement instanceof HTMLButtonElement);
    const saveAsKmlbuttonElement = document.getElementById('js-gpx2geojson-save-as-kml');
    assertIsDefined(saveAsKmlbuttonElement, 'saveAsKmlbuttonElement');
    assert(saveAsKmlbuttonElement instanceof HTMLButtonElement);
    let gpx = undefined;
    let maxLength = maxLengthInputElement.valueAsNumber;
    let interval = intervalInputElement.valueAsNumber;
    const updateInputs = () => {
        if (gpx === undefined)
            return;
        lengthInputElement.valueAsNumber = gpx.coordinates.length;
        // gpx.coordinates.length が maxLength より大きいとき，
        // 採用確率が maxLength / gpx.coordinates.length
        // 採用間隔が ceil(gpx.coordinates.length / maxLength)
        interval = Math.ceil(gpx.coordinates.length / maxLength);
        intervalInputElement.valueAsNumber = interval;
        lengthSaveInputElement.valueAsNumber = Math.floor(gpx.coordinates.length / interval);
    };
    maxLengthInputElement.addEventListener('change', () => {
        maxLength = maxLengthInputElement.valueAsNumber;
        updateInputs();
    });
    fileInputElement.addEventListener('change', () => {
        void (async () => {
            if (fileInputElement.files === null || fileInputElement.files.length === 0) {
                alert('ファイルが選択されていません');
                return;
            }
            const gpxFile = fileInputElement.files[0];
            try {
                gpx = await Gpx.fromGpxFile(gpxFile);
                updateInputs();
                saveAsGeoJsonbuttonElement.disabled = false;
                saveAsKmlbuttonElement.disabled = false;
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                    alert(error.message);
                }
                else if (typeof error === 'string') {
                    console.error(error);
                    alert(error);
                }
                else {
                    console.log(error);
                    alert(error);
                }
            }
        })();
    });
    saveAsGeoJsonbuttonElement.addEventListener('click', () => {
        if (gpx === undefined) {
            alert('gpx ファイルを選択してください');
            return;
        }
        gpx.saveGeoJsonFile(interval, lineColorInputElement.value, lineWeightInputElement.valueAsNumber);
    });
    saveAsKmlbuttonElement.addEventListener('click', () => {
        if (gpx === undefined) {
            alert('gpx ファイルを選択してください');
            return;
        }
        gpx.saveKmlFile(interval, lineColorInputElement.value, lineWeightInputElement.valueAsNumber);
    });
})();
