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

    tokens.push(Token.EOF());
    return tokens;
  }
}
