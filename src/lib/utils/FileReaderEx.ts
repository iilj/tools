/** await 可能な FileReader */
export class FileReaderEx extends FileReader {
    constructor() {
        super();
    }

    /** ファイルを文字列として読み込む．使用例：
     * const reader = new FileReaderEx();
     * const text = await reader.readAsText(fileInputElement.files[0]);
     */
    readAsText(blob: File): Promise<string | ArrayBuffer | null | undefined> {
        return new Promise((res, rej) => {
            super.addEventListener('load', ({ target }) => res(target?.result));
            super.addEventListener('error', ({ target }) => rej(target?.error));
            super.readAsText(blob);
        });
    }
}
