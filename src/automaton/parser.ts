import { NFA } from "./nfa.js";
import { EPSILON, Token, TokenType } from "./tokenizer.js";

abstract class Expression {
	abstract visitNFA(A: Set<string>, visitor: NFAVisitor): NFA;
	abstract visitPrinter(printer: ASTPrinter): string;
}

export class NFAVisitor {
	public visitLiteral(A: Set<string>, sym: string) {
		return NFA.literal(A, sym);
	}

	public visitConcatenate(A: Set<string>, left: Expression, right: Expression) {
		return NFA.concatenate(left.visitNFA(A, this), right.visitNFA(A, this));
	}

	public visitUnion(A: Set<string>, left: Expression, right: Expression) {
		return NFA.union(left.visitNFA(A, this), right.visitNFA(A, this));
	}

	public visitOption(A: Set<string>, expr: Expression) {
		return NFA.union(expr.visitNFA(A, this), EPSILON_EXPRESSION.visitNFA(A, this));
	}

	public visitStar(A: Set<string>, expr: Expression) {
		return NFA.star(expr.visitNFA(A, this));
	}

	public visitPlus(A: Set<string>, expr: Expression) {
		return NFA.concatenate(expr.visitNFA(A, this), NFA.star(expr.visitNFA(A, this)));
	}

	public visitGrouping(A: Set<string>, expr: Expression) {
		return expr.visitNFA(A, this);
	}
}

export class ASTPrinter {
	public visitLiteral(sym: string) {
		return sym;
	}

	public visitConcatenate(left: Expression, right: Expression) {
		return left.visitPrinter(this) + right.visitPrinter(this);
	}

	public visitUnion(left: Expression, right: Expression) {
		return left.visitPrinter(this) + "|" + right.visitPrinter(this);
	}

	public visitOption(expr: Expression) {
		return expr.visitPrinter(this) + "?";
	}

	public visitStar(expr: Expression) {
		return expr.visitPrinter(this) + "*";
	}

	public visitPlus(expr: Expression) {
		return expr.visitPrinter(this) + "+";
	}

	public visitGrouping(expr: Expression) {
		return "(" + expr.visitPrinter(this) + ")";
	}
}

class LiteralExpression extends Expression {
	constructor(public literal: Token) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitLiteral(A, this.literal.lexeme);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitLiteral(this.literal.lexeme);
	}
}

const EPSILON_EXPRESSION = new LiteralExpression(new Token(TokenType.Alphabet, EPSILON));

class ConcatenateExpression extends Expression {
	constructor(public left: Expression, public right: Expression) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitConcatenate(A, this.left, this.right);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitConcatenate(this.left, this.right);
	}
}

class UnionExpression extends Expression {
	constructor(public left: Expression, public right: Expression) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitUnion(A, this.left, this.right);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitUnion(this.left, this.right);
	}
}

class OptionExpression extends Expression {
	constructor(public expr: Expression) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitOption(A, this.expr);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitOption(this.expr);
	}
}

class StarExpression extends Expression {
	constructor(public expr: Expression) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitStar(A, this.expr);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitStar(this.expr);
	}
}

class PlusExpression extends Expression {
	constructor(public expr: Expression) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitPlus(A, this.expr);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitPlus(this.expr);
	}
}

class GroupingExpression extends Expression {
	constructor(public expr: Expression) {
		super();
	}

	public visitNFA(A: Set<string>, visitor: NFAVisitor) {
		return visitor.visitGrouping(A, this.expr);
	}

	public visitPrinter(printer: ASTPrinter): string {
		return printer.visitGrouping(this.expr);
	}
}

export class Parser {
	private current = 0;

	constructor(private tokens: Token[]) { }

	public parse() {
		return this.expression();
	}

	private expression(): Expression {
		return this.union();
	}

	private union(): Expression {
		let expr = this.concatenation();

		while (this.match(TokenType.Pipe)) {
			const right = this.concatenation();
			expr = new UnionExpression(expr, right);
		}

		return expr;
	}

	private concatenation(): Expression {
		let expr = this.option();

		while (this.match(TokenType.Circumpunct)) {
			const right = this.option();
			expr = new ConcatenateExpression(expr, right);
		}

		return expr;
	}

	private option(): Expression {
		let expr = this.star();

		if (this.match(TokenType.QuestionMark)) {
			expr = new OptionExpression(expr);
		}

		return expr;
	}

	private star(): Expression {
		let expr = this.plus();

		if (this.match(TokenType.Asterisk)) {
			expr = new StarExpression(expr);
		}

		return expr;
	}

	private plus(): Expression {
		let expr = this.primary();

		if (this.match(TokenType.Plus)) {
			expr = new PlusExpression(expr);
		}

		return expr;
	}

	private primary(): Expression {
		if (this.match(TokenType.Alphabet)) {
			const alph = this.previous();
			return new LiteralExpression(alph);
		}

		if (this.match(TokenType.LeftParen)) {
			const expr = this.expression();
			this.consume(TokenType.RightParen);
			return new GroupingExpression(expr);
		}

		throw new Error("HOW");
	}

	private match(...types: TokenType[]) {
		for (const type of types) {
			if (this.check(type)) {
				this.advance();
				return true;
			}
		}

		return false;
	}

	private consume(type: TokenType) {
		if (this.check(type)) return this.advance();

		throw new Error("HOW");
	}

	private check(type: TokenType) {
		if (this.isAtEnd()) return false;
		return this.peek().type == type;
	}

	private advance() {
		if (!this.isAtEnd()) ++this.current;
		return this.previous();
	}

	private isAtEnd() {
		return this.peek().type == TokenType.EOF;
	}

	private peek() {
		return this.tokens[this.current];
	}

	private previous() {
		return this.tokens[this.current - 1];
	}
}
