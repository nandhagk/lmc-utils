export const EPSILON = 'ε';
export const ALLOWED = /([a-z]|[0-9]|\||\*|\+|\?|\(|\))/;

export const enum TokenType {
	LeftParen,
	RightParen,
	Asterisk,
	Pipe,
	QuestionMark,
	Plus,
	Alphabet,
	Circumpunct,
	EOF
}

export class Token {
	constructor(
		public type: TokenType,
		public lexeme: string
	) { }
}

export class Tokenizer {
	constructor(private text: string) { }

	public tokenize() {
		const tokens = this.text
			.split('')
			.filter((char) => ALLOWED.test(char))
			.map((char) => {
				switch (char) {
					case '(':
						return new Token(TokenType.LeftParen, char);
					case ')':
						return new Token(TokenType.RightParen, char);
					case '*':
						return new Token(TokenType.Asterisk, char);
					case '+':
						return new Token(TokenType.Plus, char);
					case '|':
						return new Token(TokenType.Pipe, char);
					case '?':
						return new Token(TokenType.QuestionMark, char);
					default:
						return new Token(TokenType.Alphabet, char);
				}
			});

		const processedTokens: Token[] = [tokens[0]];
		for (let i = 1; i < tokens.length; ++i) {
			const prv = tokens[i - 1].type;
			const cur = tokens[i].type;

			if (
				(prv == TokenType.Alphabet ||
					prv == TokenType.RightParen ||
					prv == TokenType.Asterisk ||
					prv == TokenType.QuestionMark ||
					prv == TokenType.Plus) &&
				(cur == TokenType.Alphabet || cur == TokenType.LeftParen)
			)
				processedTokens.push(new Token(TokenType.Circumpunct, '.'));

			processedTokens.push(tokens[i]);
		}

		processedTokens.push(new Token(TokenType.EOF, '\0'));
		return processedTokens;
	}
}
