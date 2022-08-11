import { assert, assertIsDefined } from '../lib/utils';
import { Gpx } from './Gpx';

void (() => {
    const fileInputElement: HTMLElement | null = document.getElementById('js-gpx2geojson-input-file');
    assertIsDefined(fileInputElement, 'fileInputElement');
    assert(fileInputElement instanceof HTMLInputElement);

    const lineColorInputElement: HTMLElement | null = document.getElementById('js-gpx2geojson-input-line-color');
    assertIsDefined(lineColorInputElement, 'lineColorInputElement');
    assert(lineColorInputElement instanceof HTMLInputElement);

    const lineWeightInputElement: HTMLElement | null = document.getElementById('js-gpx2geojson-input-line-weight');
    assertIsDefined(lineWeightInputElement, 'lineColorInputElement');
    assert(lineWeightInputElement instanceof HTMLInputElement);

    const maxLengthInputElement: HTMLElement | null = document.getElementById(
        'js-gpx2geojson-input-coordinates-max-length'
    );
    assertIsDefined(maxLengthInputElement, 'maxLengthInputElement');
    assert(maxLengthInputElement instanceof HTMLInputElement);

    const intervalInputElement: HTMLElement | null = document.getElementById('js-gpx2geojson-input-interval');
    assertIsDefined(intervalInputElement, 'intervalInputElement');
    assert(intervalInputElement instanceof HTMLInputElement);

    const lengthInputElement: HTMLElement | null = document.getElementById('js-gpx2geojson-input-coordinates-length');
    assertIsDefined(lengthInputElement, 'lengthInputElement');
    assert(lengthInputElement instanceof HTMLInputElement);

    const lengthSaveInputElement: HTMLElement | null = document.getElementById(
        'js-gpx2geojson-input-coordinates-length-save'
    );
    assertIsDefined(lengthSaveInputElement, 'lengthSaveInputElement');
    assert(lengthSaveInputElement instanceof HTMLInputElement);

    const saveAsGeoJsonbuttonElement: HTMLElement | null = document.getElementById('js-gpx2geojson-save-as-geojson');
    assertIsDefined(saveAsGeoJsonbuttonElement, 'saveAsGeoJsonbuttonElement');
    assert(saveAsGeoJsonbuttonElement instanceof HTMLButtonElement);

    const saveAsKmlbuttonElement: HTMLElement | null = document.getElementById('js-gpx2geojson-save-as-kml');
    assertIsDefined(saveAsKmlbuttonElement, 'saveAsKmlbuttonElement');
    assert(saveAsKmlbuttonElement instanceof HTMLButtonElement);

    let gpx: Gpx | undefined = undefined;
    let maxLength: number = maxLengthInputElement.valueAsNumber;
    let interval: number = intervalInputElement.valueAsNumber;
    const updateInputs = () => {
        if (gpx === undefined) return;
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
        void (async (): Promise<void> => {
            if (fileInputElement.files === null || fileInputElement.files.length === 0) {
                alert('ファイルが選択されていません');
                return;
            }
            const gpxFile: File = fileInputElement.files[0];
            try {
                gpx = await Gpx.fromGpxFile(gpxFile);
                updateInputs();
                saveAsGeoJsonbuttonElement.disabled = false;
                saveAsKmlbuttonElement.disabled = false;
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                    alert(error.message);
                } else if (typeof error === 'string') {
                    console.error(error);
                    alert(error);
                } else {
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
