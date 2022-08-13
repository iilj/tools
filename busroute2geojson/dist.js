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

/** CORS を AllOrigins でバイパスするためのクラス */
class AllOrigins {
    /** CORS をバイパスしてリソースを取得する */
    static async fetch(url) {
        const allorigins_url = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(allorigins_url);
        const response_obj = (await response.json());
        return response_obj.contents;
    }
}

// interface LineInfoObj {
//     /** 会社名．"両備ホールディングス（株）" など． */
//     comp: string;
//     /** 路線名．"岡山・西大寺線" など． */
//     line: string;
// }
class BusLine {
    // private lineInfoObj: LineInfoObj | undefined;
    constructor(lid) {
        this.lid = lid;
    }
    /** パスを表す文字列をデコードする． */
    static decodePath(encoded) {
        const path = [];
        let index = 0;
        let lat = 0, lng = 0;
        while (index < encoded.length) {
            {
                let b, shift = 0, result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result = result | ((b & 0x1f) << shift);
                    shift += 5;
                } while (b >= 0x20);
                const dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
                lat += dlat;
            }
            {
                let b, shift = 0, result = 0;
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
    static latLngFromPoint(point) {
        const lng = (point.x / BusLine.TSIZE) * 360 - 180;
        const n = Math.PI - (2 * Math.PI * point.y) / BusLine.TSIZE;
        const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        return [lng, lat];
    }
    static latLngFromPixel15(x15, y15) {
        return BusLine.latLngFromPoint({ x: x15 / BusLine.ZOOM15, y: y15 / BusLine.ZOOM15 });
    }
    static getStopCoordinate(bs) {
        return BusLine.latLngFromPixel15(bs.x, bs.y);
    }
    /** 路線 ID から初期化する */
    static async init(lid) {
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
    initFromString(jsonStr) {
        this.busLineObj = JSON.parse(jsonStr);
        if (this.busLineObj.routes.length === 0) {
            throw Error('ルートが登録されていません');
        }
    }
    /** GeoJSON 文字列を生成する */
    getGeoJsonString(lineColor, lineWeight, addBusStopPoints = false) {
        if (this.busLineObj === undefined) {
            throw Error('ルートが初期化されていません');
        }
        const geojson_obj = {
            type: 'FeatureCollection',
            features: this.busLineObj.routes.map((encoded) => {
                const coordinates = BusLine.decodePath(encoded);
                // console.log(decoded);
                const feature = {
                    type: 'Feature',
                    properties: {
                        _color: lineColor,
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
            this.busLineObj.stations.forEach((station) => {
                const feature = {
                    type: 'Feature',
                    properties: {
                        name: station.name,
                        'marker-size': 'small',
                        _color: lineColor,
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
    saveGeoJsonFile(lineColor, lineWeight, addBusStopPoints = false) {
        if (this.busLineObj === undefined) {
            throw Error('路線情報が取得できませんでした');
        }
        const geoJsonString = this.getGeoJsonString(lineColor, lineWeight, addBusStopPoints);
        const filename = `${this.lid}.geojson`;
        saveFile(geoJsonString, filename);
    }
}
BusLine.TSIZE = 256;
BusLine.ZOOM15 = 32768;

void (() => {
    const urlInputElement = document.getElementById('js-busroute2geojson-input-url');
    assertIsDefined(urlInputElement, 'urlInputElement');
    assert(urlInputElement instanceof HTMLInputElement);
    const lineColorInputElement = document.getElementById('js-busroute2geojson-input-line-color');
    assertIsDefined(lineColorInputElement, 'lineColorInputElement');
    assert(lineColorInputElement instanceof HTMLInputElement);
    const lineWeightInputElement = document.getElementById('js-busroute2geojson-input-line-weight');
    assertIsDefined(lineWeightInputElement, 'lineColorInputElement');
    assert(lineWeightInputElement instanceof HTMLInputElement);
    const addBusStopPointsCheckbox = document.getElementById('js-busroute2geojson-add-busstop-points');
    assertIsDefined(addBusStopPointsCheckbox, 'addBusStopPointsCheckbox');
    assert(addBusStopPointsCheckbox instanceof HTMLInputElement);
    const saveAsGeoJsonbuttonElement = document.getElementById('js-busroute2geojson-save-as-geojson');
    assertIsDefined(saveAsGeoJsonbuttonElement, 'saveAsGeoJsonbuttonElement');
    assert(saveAsGeoJsonbuttonElement instanceof HTMLButtonElement);
    const spinnerElement = document.getElementById('js-busroute2geojson-spinner');
    assertIsDefined(spinnerElement, 'spinnerElement');
    assert(spinnerElement instanceof HTMLDivElement);
    saveAsGeoJsonbuttonElement.addEventListener('click', () => {
        void (async () => {
            try {
                spinnerElement.style.display = 'inline-block';
                const lineColor = lineColorInputElement.value;
                const lineWeight = lineWeightInputElement.valueAsNumber;
                const addBusStopPoints = addBusStopPointsCheckbox.checked;
                if (!urlInputElement.value.startsWith('https://bus-routes.net/?')) {
                    throw Error('URL が不正です．https://bus-routes.net/?... の形の URL を指定してください．');
                }
                const url = new URL(urlInputElement.value);
                const params = new URLSearchParams(url.search);
                // lid を抽出
                const lid = params.get('lid');
                if (lid === null) {
                    throw Error('路線 ID が不明です．URL に「lid」が含まれているか確認してください．');
                }
                const busLine = await BusLine.init(lid);
                busLine.saveGeoJsonFile(lineColor, lineWeight, addBusStopPoints);
            }
            catch (e) {
                alert(e);
            }
            finally {
                spinnerElement.style.display = 'none';
            }
        })();
    });
})();
