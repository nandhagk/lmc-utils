export const EPSILON = "ε";
export const ALLOWED = /([a-z]|[0-9]|[A-Z]|\||\*|\+|\?|\(|\))/;

export const enum TokenType {
  LeftParen,
  RightParen,
  Asterisk,
  Pipe,
  QuestionMark,
  Plus,
  Alphabet,
  Circumpunct,
  EOF,
}

export class Token {
  constructor(public type: TokenType, public lexeme: string) {}

  static EOF() {
    return new Token(TokenType.EOF, "\0");
  }

  static LeftParen() {
    return new Token(TokenType.LeftParen, "(");
  }

  static RightParen() {
    return new Token(TokenType.RightParen, ")");
  }

  static QuestionMark() {
    return new Token(TokenType.QuestionMark, "?");
  }

  static Asterisk() {
    return new Token(TokenType.Asterisk, "*");
  }

  static Pipe() {
    return new Token(TokenType.Pipe, "|");
  }

  static Plus() {
    return new Token(TokenType.Plus, "+");
  }

  static Circumpunct() {
    return new Token(TokenType.Circumpunct, ".");
  }

  static Alphabet(sym: string) {
    return new Token(TokenType.Alphabet, sym);
  }
}

export class Tokenizer {
  constructor(private text: string) {}

  public tokenize() {
    const tokens = this.text
      .split("")
      .filter((sym) => ALLOWED.test(sym))
      .map((sym) => {
        switch (sym) {
          case "(":
            return Token.LeftParen();
          case ")":
            return Token.RightParen();
          case "*":
            return Token.Asterisk();
          case "+":
            return Token.Plus();
          case "|":
            return Token.Pipe();
          case "?":
            return Token.QuestionMark();
          default:
            return Token.Alphabet(sym);
        }
      });

    if (tokens.length === 0) return [Token.EOF()];

    const processedTokens: Token[] = [Token.LeftParen(), tokens[0]];
    for (let i = 1; i < tokens.length; ++i) {
      const prv = tokens[i - 1].type;
      const cur = tokens[i].type;

      if (this.isConcatL(prv) && this.isConcatR(cur)) processedTokens.push(Token.Circumpunct());
      processedTokens.push(tokens[i]);
    }

    processedTokens.push(Token.RightParen());
    processedTokens.push(Token.EOF());

    return processedTokens;
  }

  private isConcatL(type: TokenType) {
    return (
      type === TokenType.Alphabet ||
      type === TokenType.RightParen ||
      type === TokenType.Asterisk ||
      type === TokenType.QuestionMark ||
      type === TokenType.Plus
    );
  }

  private isConcatR(type: TokenType) {
    return type === TokenType.Alphabet || type === TokenType.LeftParen;
  }
}
