import { EPSILON, Token, TokenType } from "@/finite-automata/lexer";
import { NFA } from "@/finite-automata/nfa";
import { HashSet } from "@/lib/hash";

abstract class Expression {
  abstract visitNFA(A: HashSet<string>, visitor: NFAVisitor): NFA;
}

export class NFAVisitor {
  public visitLiteral(A: HashSet<string>, sym: string) {
    return NFA.literal(A, sym);
  }

  public visitConcatenate(A: HashSet<string>, left: Expression, right: Expression) {
    return NFA.concatenate(left.visitNFA(A, this), right.visitNFA(A, this));
  }

  public visitUnion(A: HashSet<string>, left: Expression, right: Expression) {
    return NFA.union(left.visitNFA(A, this), right.visitNFA(A, this));
  }

  public visitOption(A: HashSet<string>, expr: Expression) {
    return NFA.union(expr.visitNFA(A, this), EPSILON_EXPRESSION.visitNFA(A, this));
  }

  public visitStar(A: HashSet<string>, expr: Expression) {
    return NFA.star(expr.visitNFA(A, this));
  }

  public visitPlus(A: HashSet<string>, expr: Expression) {
    return NFA.concatenate(expr.visitNFA(A, this), NFA.star(expr.visitNFA(A, this)));
  }

  public visitGrouping(A: HashSet<string>, expr: Expression) {
    return expr.visitNFA(A, this);
  }
}

class LiteralExpression extends Expression {
  constructor(public literal: Token) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitLiteral(A, this.literal.lexeme);
  }
}

const EPSILON_EXPRESSION = new LiteralExpression(new Token(TokenType.Alphabet, EPSILON));

class ConcatenateExpression extends Expression {
  constructor(public left: Expression, public right: Expression) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitConcatenate(A, this.left, this.right);
  }
}

class UnionExpression extends Expression {
  constructor(public left: Expression, public right: Expression) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitUnion(A, this.left, this.right);
  }
}

class OptionExpression extends Expression {
  constructor(public expr: Expression) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitOption(A, this.expr);
  }
}

class StarExpression extends Expression {
  constructor(public expr: Expression) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitStar(A, this.expr);
  }
}

class PlusExpression extends Expression {
  constructor(public expr: Expression) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitPlus(A, this.expr);
  }
}

class GroupingExpression extends Expression {
  constructor(public expr: Expression) {
    super();
  }

  public visitNFA(A: HashSet<string>, visitor: NFAVisitor) {
    return visitor.visitGrouping(A, this.expr);
  }
}

export class Parser {
  private current = 0;

  public constructor(private readonly tokens: Token[]) {}

  public parse(): Expression {
    return this.union();
  }

  public reset(): void {
    this.current = 0;
  }

  private union(): Expression {
    let expr = this.concatenate();

    if (this.match(TokenType.Pipe)) {
      expr = new UnionExpression(expr, this.union());
    }

    return expr;
  }

  private concatenate(): Expression {
    let expr = this.option();

    if (!this.isAtEnd() && !this.check(TokenType.RightParen) && !this.check(TokenType.Pipe)) {
      expr = new ConcatenateExpression(expr, this.concatenate());
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
    if (this.match(TokenType.LeftParen)) {
      const expr = this.union();

      this.consume(TokenType.RightParen);
      return new GroupingExpression(expr);
    }

    this.consume(TokenType.Alphabet);
    return new LiteralExpression(this.previous());
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private consume(type: TokenType): Token {
    if (this.check(type)) return this.advance();

    throw new Error("HOW");
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) ++this.current;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
