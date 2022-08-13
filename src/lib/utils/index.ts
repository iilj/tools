export function assertIsDefined<T>(val: T, name: string): asserts val is NonNullable<T> {
    if (val === undefined) {
        throw new Error(`Expected '${name}' to be defined, but received undefined`);
    } else if (val === null) {
        throw new Error(`Expected '${name}' to be defined, but received null`);
    }
}
export function assert(condition: boolean, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg ?? 'assertion failed');
    }
}
/** 指定された文字列を，指定されたファイル名で保存する（保存ダイアログ表示） */
export const saveFile = (content: string, filename: string): void => {
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
