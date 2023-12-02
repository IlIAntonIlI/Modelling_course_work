const seedrandom = require("seedrandom");

function RandomFunctionGenerator(seed = 0) {
  let randomSeed = seed;

  return () => {
    randomSeed++;
    return seedrandom(randomSeed)();
  };
}

function formatNumbers(matrix) {
  return matrix.map((arr) => arr.map((number) => +number.toFixed(4)));
}

module.exports.formatNumbers = formatNumbers;
module.exports.RandomFunctionGenerator = RandomFunctionGenerator;
