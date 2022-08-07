import { SExpr } from '../lib/Language';
import { Parser, Tokenizer } from '../lib/Parser';
import { assert, assertIsDefined } from '../lib/utils';
import { assertIsIntVectorFormatType, Serializer } from './Serializer';

void (() => {
    const inputElement: HTMLElement | null = document.getElementById('js-leetcode2cpp-input');
    assertIsDefined(inputElement, 'inputElement');
    assert(inputElement instanceof HTMLTextAreaElement);

    const outputElement: HTMLElement | null = document.getElementById('js-leetcode2cpp-output');
    assertIsDefined(outputElement, 'outputElement');
    assert(outputElement instanceof HTMLTextAreaElement);

    const buttonElement: HTMLElement | null = document.getElementById('js-leetcode2cpp-convert');
    assertIsDefined(buttonElement, 'buttonElement');
    assert(buttonElement instanceof HTMLButtonElement);

    const callMethodCheckbox: HTMLElement | null = document.getElementById('js-leetcode2cpp-call-method');
    assertIsDefined(callMethodCheckbox, 'callMethodCheckbox');
    assert(callMethodCheckbox instanceof HTMLInputElement);

    const intVectorFormatSelect: HTMLElement | null = document.getElementById('js-leetcode2cpp-int-vector-format');
    assertIsDefined(intVectorFormatSelect, 'intVectorFormatSelect');
    assert(intVectorFormatSelect instanceof HTMLSelectElement);

    const copyButtonElement: HTMLElement | null = document.getElementById('js-leetcode2cpp-copy-output');
    assertIsDefined(copyButtonElement, 'copyButtonElement');
    assert(copyButtonElement instanceof HTMLButtonElement);

    buttonElement.addEventListener('click', (): void => {
        const sampleInputString = inputElement.value;

        const intVectorFormat = intVectorFormatSelect.value;
        assertIsIntVectorFormatType(intVectorFormat);

        const tokens: string[] = Tokenizer.tokenize(sampleInputString);
        console.log(tokens);
        const expr: SExpr = Parser.parseTokens(tokens);

        const serializer = new Serializer(callMethodCheckbox.checked, intVectorFormat);
        const result = serializer.serialize(expr);
        console.log(expr);

        outputElement.value = result;
    });

    copyButtonElement.addEventListener('click', (): void => {
        void navigator.clipboard.writeText(outputElement.value);
    });
})();
