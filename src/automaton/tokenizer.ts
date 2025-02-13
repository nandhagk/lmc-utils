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
}

const EOF_TOKEN = new Token(TokenType.EOF, "\0");
const CIRCUMPUNCT_TOKEN = new Token(TokenType.Circumpunct, ".");

export class Tokenizer {
  constructor(private text: string) {}

  public tokenize() {
    const tokens = this.text
      .split("")
      .filter((char) => ALLOWED.test(char))
      .map((char) => {
        switch (char) {
          case "(":
            return new Token(TokenType.LeftParen, char);
          case ")":
            return new Token(TokenType.RightParen, char);
          case "*":
            return new Token(TokenType.Asterisk, char);
          case "+":
            return new Token(TokenType.Plus, char);
          case "|":
            return new Token(TokenType.Pipe, char);
          case "?":
            return new Token(TokenType.QuestionMark, char);
          default:
            return new Token(TokenType.Alphabet, char);
        }
      });

    if (tokens.length === 0) return [EOF_TOKEN];

    const processedTokens: Token[] = [tokens[0]];
    for (let i = 1; i < tokens.length; ++i) {
      const prv = tokens[i - 1].type;
      const cur = tokens[i].type;

      if (this.isConcatL(prv) && this.isConcatR(cur)) processedTokens.push(CIRCUMPUNCT_TOKEN);
      processedTokens.push(tokens[i]);
    }

    processedTokens.push(EOF_TOKEN);
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
