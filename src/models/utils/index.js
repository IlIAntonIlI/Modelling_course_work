const { sum } = require("mathjs");
const seedrandom = require("seedrandom");
let erlangSeed = 1564;

module.exports.erlang = {
  sample: (mean, dof) => {
    const randNums = [];
    for (let i = 0; i < dof; i++) {
      randNums.push(Math.log(seedrandom(erlangSeed++)()));
    }

    return -mean * sum(...randNums);
  },
};
