import { Gpx } from './Gpx';

describe('serialize', (): void => {
    test('should generate GeoJSON string conrrectly.', (): void => {
        const inputGpxString = `<?xml version="1.0" encoding="UTF-8" ?>
        <gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0">
            <time>2022-01-01T00:00:00.000Z</time>
            <trk><trkseg>
                <trkpt lat="35.0" lon="139.0">
                    <ele>56.7</ele>
                    <time>2022-01-01T00:00:01.000Z</time>
                </trkpt>
                <trkpt lat="35.1" lon="139.1">
                    <ele>56.8</ele>
                    <time>2022-01-01T00:00:02.000Z</time>
                </trkpt>
                <trkpt lat="35.2" lon="139.2">
                    <ele>56.9</ele>
                    <time>2022-01-01T00:00:02.000Z</time>
                </trkpt>
            </trkseg></trk>
        </gpx>
        `;
        const gpx: Gpx = new Gpx();
        gpx.initByString(inputGpxString);

        const interval = 1;
        const lineColor = '#ff0000';
        const lineWeight = 5;
        const geoJsonString = gpx.getGeoJsonString(interval, lineColor, lineWeight);

        expect(geoJsonString).toBe(
            '{"type":"FeatureCollection","features":[{"type":"Feature",' +
                '"properties":{"_color":"#ff0000","_opacity":1,"_weight":5},' +
                '"geometry":{"type":"LineString","coordinates":[[139,35,56.7],[139.1,35.1,56.8],[139.2,35.2,56.9]]}}]}'
        );
    });
});

describe('serialize', (): void => {
    test('should generate KML string conrrectly.', (): void => {
        const inputGpxString = `<?xml version="1.0" encoding="UTF-8" ?>
        <gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0">
            <time>2022-01-01T00:00:00.000Z</time>
            <trk><trkseg>
                <trkpt lat="35.0" lon="139.0">
                    <ele>56.7</ele>
                    <time>2022-01-01T00:00:01.000Z</time>
                </trkpt>
                <trkpt lat="35.1" lon="139.1">
                    <ele>56.8</ele>
                    <time>2022-01-01T00:00:02.000Z</time>
                </trkpt>
                <trkpt lat="35.2" lon="139.2">
                    <ele>56.9</ele>
                    <time>2022-01-01T00:00:02.000Z</time>
                </trkpt>
            </trkseg></trk>
        </gpx>
        `;
        const gpx: Gpx = new Gpx();
        gpx.initByString(inputGpxString);

        const interval = 1;
        const lineColor = '#ff0000';
        const lineWeight = 5;
        const kmlString = gpx.getKmlString(interval, lineColor, lineWeight);

        expect(kmlString).toBe(
            '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>' +
                '<Name>(unknown)</Name>' +
                '<Style id="L1"><LineStyle><color>ff0000ff</color><width>5</width></LineStyle></Style>' +
                '<Placemark><name/><styleUrl>#L1</styleUrl><LineString><altitudeMode>absolute</altitudeMode>' +
                '<coordinates>139,35,56.7 \n139.1,35.1,56.8 \n139.2,35.2,56.9</coordinates>' +
                '</LineString></Placemark></Document></kml>'
        );
    });
});
