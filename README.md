# Akinator

Akinator is a Node.js library for interacting with the Akinator web game. It allows you to play the Akinator game programmatically, answering questions and guessing the character.

## Installation

To install the Akinator library, use [npm](https://www.npmjs.com/package/akinatorjs):

```bash
npm install akinatorjs
```

## Usage

To use the Akinator library, import the `Akinator` class and create an instance:

```javascript
import { Akinator, Language } from "akinator";

const akinator = new Akinator(Language.English);
```

### Starting a New Game

To start a new game, call the `startGame()` method:

```javascript
const { ok, result } = await akinator.startGame();
if (ok) {
    console.log(`New game started! Current question: ${result.question}`);
} else {
    console.error("Error starting game:", result.error);
}
```

### Answering Questions

To answer a question, use the `answerQuestion()` method:

```javascript
const { ok, result } = await akinator.answerQuestion("y", akinator.id);
if (ok) {
    console.log(
        `Current progress: ${result.progress}, Current question: ${result.question}`
    );
} else {
    console.error("Error answering question:", result.error);
}
```

The `answerQuestion()` method takes the answer as the first argument and the game ID as the second argument.

### Going Back

To go back to the previous question, use the `back()` method:

```javascript
const { ok, result } = await akinator.back(akinator.id);
if (ok) {
    console.log(
        `Went back, current progress: ${result.progress}, current question: ${result.question}`
    );
} else {
    console.error("Error going back:", result.error);
}
```

### Handling the Result

When the Akinator game is finished, the `answerQuestion()` method will return the result:

```javascript
const { ok, result } = await akinator.answerQuestion("y", akinator.id);
if (ok && result.photo) {
    console.log(`Akinator guessed: ${result.name}`);
    console.log(`Description: ${result.description}`);
    console.log(`Photo: ${result.photo}`);
} else {
    console.error("Error getting result:", result.error);
}
```

## License

This project is licensed under the MIT License.

## Contributing

If you find any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request on the GitHub repository.
