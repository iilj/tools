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
