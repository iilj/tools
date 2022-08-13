/** CORS を AllOrigins でバイパスした際の応答 */
interface AllOriginsResponse {
    /** メタデータ */
    status: {
        /** 3983 など */
        content_length: number;
        /** "application/json" など */
        content_type: string;
        /** 200 など */
        http_code: number;
        /** 1119 など */
        response_time: number;
        /** "https://bus-routes.net/modules/get_line.php?lid=1908" など */
        url: string;
    };
    /** レスポンス本体 */
    contents: string;
}

/** CORS を AllOrigins でバイパスするためのクラス */
export class AllOrigins {
    /** CORS をバイパスしてリソースを取得する */
    static async fetch(url: string): Promise<string> {
        const allorigins_url = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(allorigins_url);
        const response_obj = (await response.json()) as AllOriginsResponse;
        return response_obj.contents;
    }
}
