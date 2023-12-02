const jstat = require("jstat");
const { Block, Create, Model, Process, Queue } = require("./models");

const creator = new Create();
creator.defaultDelayOptions = {
  distribution: "exponential",
  exponential: {
    lambda: 1 / 0.5,
  },
};
creator.setName("CREATOR");

const bankWorker1 = new Process(1);
bankWorker1.defaultDelayOptions = {
  distribution: "exponential",
  exponential: {
    lambda: 1 / 0.3,
  },
};
bankWorker1.setName("Cashier1");

const bankWorker2 = new Process(1);
bankWorker2.defaultDelayOptions = {
  distribution: "exponential",
  exponential: {
    lambda: 1 / 0.3,
  },
};
bankWorker2.setName("Cashier2");

const queue1 = new Queue(3);
queue1.setName("Queue1");

const queue2 = new Queue(3);
queue2.setName("Queue2");

const block1 = new Block(() => {
  if (queue1.length <= queue2.length) {
    return false;
  }

  return true;
});
block1.setName("Block1");

const block2 = new Block(() => {
  if (queue1.length > queue2.length) {
    return false;
  }

  return true;
});
block2.setName("Block2");

queue1.addNextElement(bankWorker1);
queue2.addNextElement(bankWorker2);
block1.addNextElement(queue1);
block2.addNextElement(queue2);
creator.addNextElement(block1);
creator.addNextElement(block2);

//set initial state
bankWorker1.setNextItemStartTime(jstat.normal.sample(1, 0.3));
bankWorker2.setNextItemStartTime(jstat.normal.sample(1, 0.3));

creator.setNextItemStartTime(0.1);

bankWorker1.getQueue().push({}, {});
bankWorker2.getQueue().push({}, {});

const result = {
  avgNumOfClientsInside: 0,
  avgProcessingTime: 0,
  countQueueChanges: 0,
};

const switchQueue = () => {
  if (queue1.length - queue2.length >= 2) {
    queue1.pop();
    queue2.unshift({});
    result.countQueueChanges++;
  }

  if (queue2.length - queue1.length >= 2) {
    queue2.pop();
    queue1.unshift({});
    result.countQueueChanges++;
  }
};

const doModelStatistics = (delta) => {
  result.avgNumOfClientsInside =
    result.avgNumOfClientsInside +
    delta * (bankWorker1.getQueue().length + bankWorker2.getQueue().length + bankWorker1.countOfProcessingOrWaiting + bankWorker2.countOfProcessingOrWaiting);
};

const resetModelStatistics = () => {
  result.avgNumOfClientsInside = 0;
  result.avgProcessingTime = 0;
  result.countQueueChanges = 0;
};

const modelingTime = 1000;
const statisticsStartTime = 0;
const model = new Model([
  creator,
  block1,
  block2,
  queue1,
  queue2,
  bankWorker1,
  bankWorker2,
]);
model.simulate(modelingTime, statisticsStartTime, doModelStatistics, resetModelStatistics, [switchQueue]);

//output stats
const time = modelingTime - statisticsStartTime;
console.log("\n---------MODEL STATS---------");
console.log("CREATOR quantity", creator.getQuantity());
console.log(
  "Average number of clients inside bank:",
  result.avgNumOfClientsInside / time
);
console.log(
  "Average interval between outs:",
  (time / (bankWorker1.getQuantity() + bankWorker2.getQuantity()))
);

console.log(
  "Average time spent by client in bank:",
  (queue1.getQueueTotalLength() +
    queue2.getQueueTotalLength() +
    bankWorker1.getBusyTime() +
    bankWorker2.getBusyTime()) /
    creator.getQuantity()
);

console.log(
  "Percentage of lost clients:",
  (queue1.getFailures() + queue2.getFailures()) / creator.getQuantity()
);
console.log("Count of queue changes:", result.countQueueChanges);
