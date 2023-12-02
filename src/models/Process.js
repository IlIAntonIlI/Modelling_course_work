const { Element } = require("./Element");

class Process extends Element {
  #failures = 0;
  #busyTime = 0;
  #nWorkers;
  #useEntityDelayOptions = false;
  #workersTasks = [];
  #processedTasks = [];
  #useProcessedTasks = false;
  #isProcessBlockedInEnabled = false;
  #updateBeforeOut = (task) => task.element;

  constructor(nWorkers, helpers) {
    super();
    super.setName("Processor" + super.getId());
    super.setNextItemStartTime(Number.MAX_SAFE_INTEGER);
    this.#nWorkers = nWorkers || this.#nWorkers;

    // tip: should always return object passed between processes, not a task
    this.#updateBeforeOut = helpers?.updateBeforeOut || this.#updateBeforeOut;
  }

  inAct(element) {
    if (this.#workersTasks.length + this.#processedTasks.length < this.#nWorkers) {
      const endTime = super.getCurrentTime() + this.getDelay(element);
      this.#workersTasks.push({
        element,
        startTime: super.getCurrentTime(),
        endTime,
      });

      super.setNextItemStartTime(
        Math.min(...this.#workersTasks.map((task) => task.endTime))
      );
      return;
    }

    this.#failures++;
  }

  outAct() {
    const completedTask = this.#workersTasks.splice(
      this.#workersTasks.findIndex(
        (task) => super.getCurrentTime() === task.endTime
      ),
      1
    )[0];

    super.setNextItemStartTime(
      this.#workersTasks.length
        ? Math.min(...this.#workersTasks.map((task) => task.endTime))
        : Number.MAX_SAFE_INTEGER
    );

    const queue = this.getMostPriorityQueueWithItems(super.getQueues());
    const queueNextElement = queue?.getNextElement();
    if (queue?.length > 0 && this.canIn() && queueNextElement) {
      const element = queue.outAct();

      const endTime = super.getCurrentTime() + this.getDelay(element);
      this.#workersTasks.push({
        element,
        startTime: super.getCurrentTime(),
        endTime,
      });

      super.setNextItemStartTime(
        Math.min(...this.#workersTasks.map((task) => task.endTime))
      );
    }

    if (!completedTask) {
      return;
    }

    const dataElementToSend = this.#updateBeforeOut(completedTask);
    const nextElement = super.getNextElement(dataElementToSend);

    const nextElementAcceptNewItems = nextElement?.canIn();
    if (!nextElementAcceptNewItems && this.#useProcessedTasks || !nextElement && this.getNextElementsLength()) {
      this.#processedTasks.push(dataElementToSend);

      return;
    }

    super.outAct();
    nextElement?.inAct?.(dataElementToSend);
  }

  inElementIfNotBlockedAndBusy() {
    const queue = this.getMostPriorityQueueWithItems(super.getQueues());
    const queueNextElement = queue?.getNextElement();
    if (queue?.length > 0 && queueNextElement && this.getNextItemStartTime() === Number.MAX_SAFE_INTEGER) {
      const element = queue.outAct();
      const endTime = super.getCurrentTime() + this.getDelay(element);
      this.#workersTasks.push({
        element,
        startTime: super.getCurrentTime(),
        endTime,
      });
  
      super.setNextItemStartTime(
        Math.min(...this.#workersTasks.map((task) => task.endTime))
      );
    }
  }
 
  outProcessedAct() {
    if (!this.#processedTasks?.length) {
      return ;
    }
    const dataElement = this.#processedTasks[0];
    const nextElement = super.getNextElement(dataElement);
    if (!nextElement?.canIn()){
      return
    }

    this.#processedTasks.shift();

    const queue = this.getMostPriorityQueueWithItems(super.getQueues());
    const queueNextElement = queue?.getNextElement();
    if (queue?.length > 0 && this.canIn() && queueNextElement) {
      const element = queue.outAct();

      const endTime = super.getCurrentTime() + this.getDelay(element);
      this.#workersTasks.push({
        element,
        startTime: super.getCurrentTime(),
        endTime,
      });

      super.setNextItemStartTime(
        Math.min(...this.#workersTasks.map((task) => task.endTime))
      );
    }

    super.outAct();
    nextElement?.inAct?.(dataElement);
  }

  getMostPriorityQueueWithItems(queues) {
    if (!queues?.length) {
      return ;
    }

    let queue = queues[0];
    let maxValue = queue.value;
    for (let i = 1; i < queues.length; i++) {
      if (
        queues[i].queue.length > 0 &&
        (queues[i].value > maxValue || !queue.length)
      ) {
        queue = queues[i];
        maxValue = queue.value;
      }
    }

    return queue.queue;
  }

  getDelay(entity) {
    if (this.#useEntityDelayOptions) {
      return super.getDelay(entity);
    }

    return super.getDelay();
  }

  canIn() {
    return this.countOfProcessingOrWaiting < this.#nWorkers;
  }

  printResult() {
    console.log(super.getName() + " quantity = " + this.getQuantity());
  }

  doStatistics(delta) {
    if (this.countOfProcessingOrWaiting > 0) {
      this.#busyTime += delta;
    }
  }

  resetStats() {
    super.resetStats();
    this.#busyTime = 0;
  }

  getFailures() {
    return this.#failures;
  }

  getBusyTime() {
    return this.#busyTime;
  }

  getQuantity() {
    return this.#failures + super.getQuantity();
  }

  setUseEntityDelayOptions(value) {
    this.#useEntityDelayOptions = value;
  }

  enableProcessedTasks() {
    this.#useProcessedTasks = true;
  }

  setIsProcessBlockedInEnabled(val) {
    this.#isProcessBlockedInEnabled = val;
  }
  
  isProcessBlockedInEnabled(){
    return this.#isProcessBlockedInEnabled;
  }

  get countOfProcessingOrWaiting() {
    return this.#workersTasks.length + this.#processedTasks.length;
  }
}

module.exports.Process = Process;
