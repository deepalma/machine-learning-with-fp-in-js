const SLR = require('ml-regression').SLR;  // Simple Linear Regression
const csv = require('csvtojson'); // JSON parser for CSV data
const readline = require('readline');
const R = require('ramda');
const { IO, Future, Tuple } = require('ramda-fantasy');

//////////////////////////////////////////////////////
// Utils
const log = x => {
  console.log(x);
  return x;
};

const IOToFuture = io => Future((reject, resolve) => resolve(io.runIO()));

//////////////////////////////////////////////////////
// Domain related functions

// String -> [csvData] -> Number
const dress = prop => R.map(R.pipe(R.path(prop), parseFloat));

// String -> Future [csvData]
const readFromCSVFile = filePath =>
  Future((reject, resolve) =>
    csv()
      .fromFile(filePath)
      .on('end_parsed', resolve)
  );

// String -> String -> [csvData] -> RegressionModel
const createRegressionModel = R.curry(
  (prop1, prop2, data) => new SLR(dress([prop1])(data), dress([prop2])(data))
);

// RegressionModel -> IO RegressionModel
const printRegressionModel = regressionModel => IO(() => {
  console.log('Regression model: ', regressionModel.toString());
  return regressionModel;
});

// RegressionModel -> Future Number -> Future Tuple Number Number
const predict = regressionModel => userInput => {
  return userInput.map(x => Tuple(x, regressionModel.predict(x)))
};

// String -> Future Number
const askUserInput = (text) => {
  return Future((reject, resolve) => {

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(text, input => {
      const parsedInput = parseFloat(input);
      isNaN(parsedInput)
        ? reject('Error!!! The input provided if of the wrong type. Terminating ...')
        : resolve(parsedInput);

      rl.close();
    });
  });
};

// Number -> Number -> IO ()
const printPrediction = y => x => IO.of(console.log(`At X = ${x}, y = ${y}`));

//////////////////////////////////////////////////////
// Program flow declaration

const program = (csvFilePath, prop1, prop2) =>
  readFromCSVFile(csvFilePath)
    // Future e [csvData]

    .map(createRegressionModel(prop1, prop2))
    // Future e RegressionModel

    .map(printRegressionModel).chain(IOToFuture)
    // Future e RegressionModel

    .map(predict)
    // Future (Future Number -> Future Tuple Number Number)

    .chain(x => x(askUserInput('Enter input X for prediction (Press CTRL+C to exit) : \n')))
    // Future Tuple Number Number

    .map(x => printPrediction(Tuple.snd(x))(Tuple.fst(x))).chain(IOToFuture);
    // Future ()

//////////////////////////////////////////////////////
// Program execution
program('advertising.csv', 'Radio', 'Sales').fork(console.error, () => {});



