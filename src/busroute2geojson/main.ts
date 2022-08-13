import { assert, assertIsDefined } from '../lib/utils';
import { BusLine } from './BusLine';

void (() => {
    const urlInputElement: HTMLElement | null = document.getElementById('js-busroute2geojson-input-url');
    assertIsDefined(urlInputElement, 'urlInputElement');
    assert(urlInputElement instanceof HTMLInputElement);

    const lineColorInputElement: HTMLElement | null = document.getElementById('js-busroute2geojson-input-line-color');
    assertIsDefined(lineColorInputElement, 'lineColorInputElement');
    assert(lineColorInputElement instanceof HTMLInputElement);

    const lineWeightInputElement: HTMLElement | null = document.getElementById('js-busroute2geojson-input-line-weight');
    assertIsDefined(lineWeightInputElement, 'lineColorInputElement');
    assert(lineWeightInputElement instanceof HTMLInputElement);

    const addBusStopPointsCheckbox: HTMLElement | null = document.getElementById(
        'js-busroute2geojson-add-busstop-points'
    );
    assertIsDefined(addBusStopPointsCheckbox, 'addBusStopPointsCheckbox');
    assert(addBusStopPointsCheckbox instanceof HTMLInputElement);

    const saveAsGeoJsonbuttonElement: HTMLElement | null = document.getElementById(
        'js-busroute2geojson-save-as-geojson'
    );
    assertIsDefined(saveAsGeoJsonbuttonElement, 'saveAsGeoJsonbuttonElement');
    assert(saveAsGeoJsonbuttonElement instanceof HTMLButtonElement);

    const spinnerElement: HTMLElement | null = document.getElementById('js-busroute2geojson-spinner');
    assertIsDefined(spinnerElement, 'spinnerElement');
    assert(spinnerElement instanceof HTMLDivElement);

    saveAsGeoJsonbuttonElement.addEventListener('click', () => {
        void (async (): Promise<void> => {
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
            } catch (e) {
                alert(e);
            } finally {
                spinnerElement.style.display = 'none';
            }
        })();
    });
})();
