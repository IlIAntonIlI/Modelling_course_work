const jstat = require("jstat");
const { Block, Create, Model, Process, Queue } = require("./models");

const roadTrafficCreator = new Create();
roadTrafficCreator.defaultDelayOptions = {
  distribution: "uniform",
  uniform: {
    rangeStart: 0.3,
    rangeEnd: 0.5   
  },
};
roadTrafficCreator.setName("ROAD CARS CREATOR");

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
bankWorker1.enableProcessedTasks();

const bankWorker2 = new Process(1);
bankWorker2.defaultDelayOptions = {
  distribution: "exponential",
  exponential: {
    lambda: 1 / 0.3,
  },
};
bankWorker2.setName("Cashier2");
bankWorker2.enableProcessedTasks();

const outOfBankNarrowToStreet = new Process(1);
outOfBankNarrowToStreet.defaultDelayOptions = {
  distribution: "exponential",
  exponential: {
    lambda: 1 / 0.2,
  },
};
outOfBankNarrowToStreet.setName("Car out of bank narrow to road");
outOfBankNarrowToStreet.setIsProcessBlockedInEnabled(true);

const crossRoad = new Process(Number.MAX_SAFE_INTEGER);
crossRoad.defaultDelayOptions = {
  distribution: "exponential",
  exponential: {
    lambda: 1 / 0.2,
  },
};
crossRoad.setName("Cross road by cars");

const queue1 = new Queue(3);
queue1.setName("Queue1");

const queue2 = new Queue(3);
queue2.setName("Queue2");

const queue3 = new Queue(3, undefined, 10);
queue3.setName("Queue3");

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

const block3 = new Block(() => {
  if (queue3.length < 3) {
    return false;
  }

  return true;
});
block3.setName("Block3");

const block4 = new Block(() => {
  if (crossRoad.countOfProcessingOrWaiting > 0) {
    return true;
  }

  return false;
});
block4.setName("Block4");

creator.addNextElement(block1);
creator.addNextElement(block2);
block1.addNextElement(queue1);
block2.addNextElement(queue2);
queue1.addNextElement(bankWorker1);
queue2.addNextElement(bankWorker2);
bankWorker1.addNextElement(block3);
bankWorker2.addNextElement(block3);
block3.addNextElement(queue3);
block4.addNextElement(outOfBankNarrowToStreet);
queue3.addNextElement(block4);
roadTrafficCreator.addNextElement(crossRoad);

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

const checkProcessedElements = () => {
  const randomNumber = Math.random();
  if (randomNumber < 0.7) {
    bankWorker1.outProcessedAct();
    bankWorker2.outProcessedAct();
  } else {
    bankWorker2.outProcessedAct();
    bankWorker1.outProcessedAct();
  }
} 

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
  block3,
  block4,
  queue1,
  queue2,
  bankWorker1,
  bankWorker2,
  queue3,
  outOfBankNarrowToStreet,
  roadTrafficCreator,
  crossRoad
]);
model.simulate(modelingTime, statisticsStartTime, doModelStatistics, resetModelStatistics, [switchQueue, checkProcessedElements]);

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
