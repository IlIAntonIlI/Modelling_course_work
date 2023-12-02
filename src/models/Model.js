const { Process } = require("./Process");
const { Queue } = require("./Queue");

class Model {
  #elements;
  #nextItemStartTime = 0;
  #currentTime;
  #nextEventCaller;
  #lastSimulationStatisticsTime;

  constructor(elements) {
    this.#elements = elements;
    this.#currentTime = this.#nextItemStartTime;
  }

  simulate(time, statisticsStartTime=0, doModelStatistics, resetModelStatistics, additionalActions) {
    this.#lastSimulationStatisticsTime = time - statisticsStartTime; 
    let isReseted = false;
    while (this.#currentTime < time) {
      this.#nextItemStartTime = Number.MAX_VALUE;

      this.#elements.forEach((element) => {
        if (element.getNextItemStartTime() < this.#nextItemStartTime) {
          this.#nextItemStartTime = element.getNextItemStartTime();
          this.#nextEventCaller = element;
        }
      });

      this.#elements.forEach((element) => {
        if (!isReseted && this.#nextItemStartTime / statisticsStartTime > 1) {
          element.resetStats();
        }
        element.doStatistics?.(this.#nextItemStartTime - this.#currentTime);
      });
      doModelStatistics?.(this.#nextItemStartTime - this.#currentTime);

      this.#currentTime = this.#nextItemStartTime;

      this.#elements.forEach((element) => {
        element.setCurrentTime(this.#currentTime);
      });

      this.#nextEventCaller.outAct();

      this.#elements.forEach((element) => {
        if (element.getNextItemStartTime() == this.#currentTime) {
          element.outAct();
        }
      });

      if (this.#currentTime / statisticsStartTime > 1) {
        this.#elements.forEach((element) => {
          if (element?.isProcessBlockedInEnabled?.()) {
            element.inElementIfNotBlockedAndBusy();
          }
        });
      }
      additionalActions && additionalActions.forEach((action) => action());
      if (!isReseted && this.#currentTime / statisticsStartTime > 1) {
        
        resetModelStatistics();
        isReseted = true;
      }
    }

    this.printResult();
  }

  printResult() {
    console.log("\n-------------RESULTS-------------");

    this.#elements.forEach((element) => {
      element?.printResult?.();

      if (element instanceof Process) {
        const name = element.getName();
        console.log(
          `${name} average load = ${
            element.getBusyTime() / this.#lastSimulationStatisticsTime
          }\n`
        );
      }

      if (element instanceof Queue) {
        const name = element.getName();
        console.log(
          `${name} average length = ${
            element.getQueueTotalLength() / this.#lastSimulationStatisticsTime
          }\n`
        );
      }
    });
  }
}

module.exports.Model = Model;
