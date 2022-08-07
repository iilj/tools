import { FollowingOp, Infix, LeadingOp, Paren, Postfix, Prefix, SExpr } from '../lib/Language';

export const PowerStyle = {
    /** a ^ b */
    Hat: 0,
    /** a ** b */
    Asterisk: 1,
    /** pow(a, b) */
    PowFunction: 2,
    /** a.pow(b) */
    PowMethod: 3,
} as const;
export type PowerStyle = typeof PowerStyle[keyof typeof PowerStyle];

export class Serializer {
    powerStyle: PowerStyle;
    wrapLeftHandOperandLiteral: boolean;
    private static re = /^\d+$/;

    constructor(powerStyle: PowerStyle = PowerStyle.PowMethod, wrapLeftHandOperandLiteral = false) {
        this.powerStyle = powerStyle;
        this.wrapLeftHandOperandLiteral = wrapLeftHandOperandLiteral;
    }

    serialize(expr: SExpr): string {
        if (expr.operatorRef instanceof LeadingOp) {
            if (expr.operatorRef instanceof Paren) {
                return `${expr.list.map((value: SExpr): string => this.serialize(value)).join(' ')}`;
            } else if (expr.operatorRef instanceof Prefix) {
                return `(${expr.operatorRef.symbols[0]}${expr.list
                    .map((value: SExpr): string => this.serialize(value))
                    .join(' ')})`;
            }
        } else if (expr.operatorRef instanceof FollowingOp) {
            if (expr.operatorRef instanceof Postfix) {
                if (expr.atom === '!') {
                    return `fact(${expr.list.map((value: SExpr): string => this.serialize(value)).join(' ')})`;
                } else {
                    return `${expr.atom}(${expr.operatorRef.symbols[0]}(${expr.list
                        .map((value: SExpr): string => this.serialize(value))
                        .join(' ')})`;
                }
            } else if (expr.operatorRef instanceof Infix) {
                if (expr.atom === '^') {
                    if (this.wrapLeftHandOperandLiteral && Serializer.re.test(expr.list[0].atom)) {
                        if (this.powerStyle === PowerStyle.Hat) {
                            return `(mint(${expr.list[0].atom}) ^ ${this.serialize(expr.list[1])})`;
                        } else if (this.powerStyle === PowerStyle.Asterisk) {
                            return `(mint(${expr.list[0].atom}) ** ${this.serialize(expr.list[1])})`;
                        } else if (this.powerStyle === PowerStyle.PowFunction) {
                            return `pow(${expr.list.map((value: SExpr): string => this.serialize(value)).join(', ')})`;
                        } else {
                            return `mint(${this.serialize(expr.list[0])}).pow(${this.serialize(expr.list[1])})`;
                        }
                    }
                    if (this.powerStyle === PowerStyle.Hat) {
                        return `(${expr.list.map((value: SExpr): string => this.serialize(value)).join(' ^ ')})`;
                    } else if (this.powerStyle === PowerStyle.Asterisk) {
                        return `(${expr.list.map((value: SExpr): string => this.serialize(value)).join(' ** ')})`;
                    } else if (this.powerStyle === PowerStyle.PowFunction) {
                        return `pow(${expr.list.map((value: SExpr): string => this.serialize(value)).join(', ')})`;
                    } else {
                        return `${this.serialize(expr.list[0])}.pow(${this.serialize(expr.list[1])})`;
                    }
                } else if (expr.atom === '_') {
                    return `(${expr.list.map((value: SExpr): string => this.serialize(value)).join('_')})`;
                } else {
                    const separator = expr.atom === 'prod' ? ' * ' : ` ${expr.atom} `;
                    if (this.wrapLeftHandOperandLiteral && Serializer.re.test(expr.list[0].atom)) {
                        return `(mint(${expr.list[0].atom})${separator}${this.serialize(expr.list[1])})`;
                    }
                    return `(${expr.list.map((value: SExpr): string => this.serialize(value)).join(separator)})`;
                }
            }
        }
        return expr.atom;
        // throw new Error(`Unknown expression: ${expr.toString()}`);
    }
}
