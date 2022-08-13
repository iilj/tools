import { saveFile } from '../lib/utils';
import { AllOrigins } from '../lib/utils/AllOrigins';
import { FeatureCollection, Feature } from 'geojson';

interface Station {
    /** "187784" など */
    sid: string;
    /** "岡山市役所前" など */
    name: string;
    /** "1" など */
    type: string;
    /** "7314840" など */
    x: number;
    /** "3332492" など */
    y: number;
}
interface BusLineObj {
    /** "OK" など */
    status: string;
    stations: Station[];
    /** パスを表す文字列の配列．各要素はデコードする必要がある． */
    routes: string[];
}
// interface LineInfoObj {
//     /** 会社名．"両備ホールディングス（株）" など． */
//     comp: string;
//     /** 路線名．"岡山・西大寺線" など． */
//     line: string;
// }

export class BusLine {
    private busLineObj: BusLineObj | undefined;
    // private lineInfoObj: LineInfoObj | undefined;
    constructor(private lid: string) {}

    /** パスを表す文字列をデコードする． */
    private static decodePath(encoded: string): [number, number][] {
        const path: [number, number][] = [];
        let index = 0;
        let lat = 0,
            lng = 0;
        while (index < encoded.length) {
            {
                let b,
                    shift = 0,
                    result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result = result | ((b & 0x1f) << shift);
                    shift += 5;
                } while (b >= 0x20);
                const dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
                lat += dlat;
            }
            {
                let b,
                    shift = 0,
                    result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result = result | ((b & 0x1f) << shift);
                    shift += 5;
                } while (b >= 0x20);
                const dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
                lng += dlng;
            }
            path.push([lng / 1e5, lat / 1e5]);
        }
        return path;
    }

    private static TSIZE = 256;
    private static latLngFromPoint(point: { x: number; y: number }): [number, number] {
        const lng = (point.x / BusLine.TSIZE) * 360 - 180;
        const n = Math.PI - (2 * Math.PI * point.y) / BusLine.TSIZE;
        const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        return [lng, lat];
    }

    private static ZOOM15 = 32768;
    private static latLngFromPixel15(x15: number, y15: number): [number, number] {
        return BusLine.latLngFromPoint({ x: x15 / BusLine.ZOOM15, y: y15 / BusLine.ZOOM15 });
    }

    private static getStopCoordinate(bs: Station): [number, number] {
        return BusLine.latLngFromPixel15(bs.x, bs.y);
    }

    /** 路線 ID から初期化する */
    static async init(lid: string): Promise<BusLine> {
        const busLine = new BusLine(lid);

        const jsonUrl = `https://bus-routes.net/modules/get_line.php?lid=${lid}`;
        const jsonStr = await AllOrigins.fetch(jsonUrl);
        busLine.initFromString(jsonStr);

        // const lineInfoJsonUrl = `https://bus-routes.net/modules/get_line_info.php?lid=${lid}`;
        // const lineInfoJsonStr = await AllOrigins.fetch(lineInfoJsonUrl);
        // busLine.lineInfoObj = JSON.parse(lineInfoJsonStr) as LineInfoObj;

        return busLine;
    }

    /** 路線情報の JSON 文字列から初期化する */
    initFromString(jsonStr: string) {
        this.busLineObj = JSON.parse(jsonStr) as BusLineObj;

        if (this.busLineObj.routes.length === 0) {
            throw Error('ルートが登録されていません');
        }
    }

    /** GeoJSON 文字列を生成する */
    getGeoJsonString(lineColor: string, lineWeight: number, addBusStopPoints = false) {
        if (this.busLineObj === undefined) {
            throw Error('ルートが初期化されていません');
        }

        const geojson_obj: FeatureCollection = {
            type: 'FeatureCollection',
            features: this.busLineObj.routes.map((encoded: string) => {
                const coordinates: [number, number][] = BusLine.decodePath(encoded);
                // console.log(decoded);
                const feature: Feature = {
                    type: 'Feature',
                    properties: {
                        _color: lineColor, // '#ff0000',
                        _opacity: 1,
                        _weight: lineWeight, // 5,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates,
                    },
                };
                return feature;
            }),
        };
        if (addBusStopPoints) {
            this.busLineObj.stations.forEach((station: Station) => {
                const feature: Feature = {
                    type: 'Feature',
                    properties: {
                        name: station.name,
                        'marker-size': 'small',
                        _color: lineColor, // '#ff0000',
                        _opacity: 1,
                        _weight: lineWeight, // 5,
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: BusLine.getStopCoordinate(station),
                    },
                };
                geojson_obj.features.push(feature);
            });
        }

        const geoJsonString = JSON.stringify(geojson_obj);
        return geoJsonString;
    }

    /** GeoJSON ファイルに保存する */
    saveGeoJsonFile(lineColor: string, lineWeight: number, addBusStopPoints = false) {
        if (this.busLineObj === undefined) {
            throw Error('路線情報が取得できませんでした');
        }
        const geoJsonString = this.getGeoJsonString(lineColor, lineWeight, addBusStopPoints);
        const filename = `${this.lid}.geojson`;

        saveFile(geoJsonString, filename);
    }
}
