import { SExpr } from '../lib/Language';
import { Parser } from '../lib/Parser';
import { assert, assertIsDefined } from '../lib/utils';
import { PowerStyle, Serializer } from './Serializer';

void (() => {
    const inputElement: HTMLElement | null = document.getElementById('js-wolfram2cpp-input');
    assertIsDefined(inputElement, 'inputElement');
    assert(inputElement instanceof HTMLTextAreaElement);

    const outputElement: HTMLElement | null = document.getElementById('js-wolfram2cpp-output');
    assertIsDefined(outputElement, 'outputElement');
    assert(outputElement instanceof HTMLTextAreaElement);

    const buttonElement: HTMLElement | null = document.getElementById('js-wolfram2cpp-convert');
    assertIsDefined(buttonElement, 'buttonElement');
    assert(buttonElement instanceof HTMLButtonElement);

    const powerStyleSelectElement: HTMLElement | null = document.getElementById('js-wolfram2cpp-power-style');
    assertIsDefined(powerStyleSelectElement, 'powerStyleSelectElement');
    assert(powerStyleSelectElement instanceof HTMLSelectElement);

    const leftHandOperandLiteralWrapCheckbox: HTMLElement | null = document.getElementById(
        'js-wolfram2cpp-left-hand-operand-literal-wrap'
    );
    assertIsDefined(leftHandOperandLiteralWrapCheckbox, 'leftHandOperandLiteralWrapCheckbox');
    assert(leftHandOperandLiteralWrapCheckbox instanceof HTMLInputElement);

    const copyButtonElement: HTMLElement | null = document.getElementById('js-leetcode2cpp-copy-output');
    assertIsDefined(copyButtonElement, 'copyButtonElement');
    assert(copyButtonElement instanceof HTMLButtonElement);

    buttonElement.addEventListener('click', (): void => {
        const wolframString = inputElement.value;

        const expr: SExpr = Parser.parse(wolframString);
        // const result = expr.toString();

        const powerStyle = Number(powerStyleSelectElement.value) as PowerStyle;
        const wrapLeftHandOperandLiteral = leftHandOperandLiteralWrapCheckbox.checked;
        const serializer = new Serializer(powerStyle, wrapLeftHandOperandLiteral);
        const result = serializer.serialize(expr);
        console.log(expr);

        outputElement.value = result;

        // const a = new SExpr('2');
        // const b = new SExpr('3');
        // const c = new SExpr('+', [a, b]);
        // const d = new SExpr('1');
        // const e = new SExpr('+', [d, c]);
        // console.log(e.toString());
    });

    copyButtonElement.addEventListener('click', (): void => {
        void navigator.clipboard.writeText(outputElement.value);
    });
})();
