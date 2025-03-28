export const EPSILON = "ε";
export const ALT_EPSILON = "~";
export const ALLOWED = new RegExp(`([a-z]|[0-9]|[A-Z]|${EPSILON}|${ALT_EPSILON}|\\||\\*|\\+|\\?|\\(|\\))`);

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

  public static EOF(): Token {
    return new Token(TokenType.EOF, "\0");
  }

  public static LeftParen(): Token {
    return new Token(TokenType.LeftParen, "(");
  }

  public static RightParen(): Token {
    return new Token(TokenType.RightParen, ")");
  }

  public static QuestionMark(): Token {
    return new Token(TokenType.QuestionMark, "?");
  }

  public static Asterisk(): Token {
    return new Token(TokenType.Asterisk, "*");
  }

  public static Pipe(): Token {
    return new Token(TokenType.Pipe, "|");
  }

  public static Plus(): Token {
    return new Token(TokenType.Plus, "+");
  }

  public static Alphabet(sym: string): Token {
    return new Token(TokenType.Alphabet, sym);
  }
}

export class Lexer {
  constructor(private readonly text: string) {}

  public lex(): Token[] {
    const tokens = [...this.text.replaceAll(ALT_EPSILON, EPSILON)]
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
