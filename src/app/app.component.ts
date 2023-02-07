import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { AbiItem } from 'web3-utils'
import SimpleFundContractJson from '../../build/contracts/SimpleFundContract.json';
import PriceConsumerV3Json from '../../build/contracts/PriceConsumerV3.json';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
declare let window: any;
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  // Checking for prerequisites
  isMetamaskInstalled: boolean = false;
  isNetworkCorrect: boolean = false;
  isSiteConnected: boolean = false;

  // Show/hide sections
  showWelcome: boolean = true;
  showInfo: boolean = false;
  showGeneral: boolean = false;
  showFunding: boolean = false;
  showTransactions: boolean = false;

  // General
  web3: Web3;
  netId: number = -1;
  networkName: string = "";
  focusChanged: boolean = false;
  interfaceEnabled: boolean = true;

  // Account
  accountAddress: string = "";
  accountBalance: string = "0";

  // SimpleFundContract contract
  simpleFundContractObject: any;
  simpleFundContractAddress: string = "";
  simpleFundContractBalance: string = "0";
  ethFundAmount: string = "0.1";
  funders: string[] = [];
  numberOfLatestFunders: number = 5;
  numberOfLatestTransactions: number = 5;

  // PriceConsumerV3 contract
  priceConsumerV3Object: any;
  price: string = "";
  priceRounded: string = "";

  // Alerts
  ALERT_TIMEOUT: number = 10000;
  dangerAlertText: string = "";
  successAlertText: string = "";
  infoAlertText: string = "";

  // Transactions
  transactionText: string = "";
  isTransactionInProgress: boolean = false;
  transactions: any[] = [];
  numberOfBlocksToCheck: number = 0;

  constructor(private renderer: Renderer2) { }

  async ngOnInit() {
    // Check
    await this.init();
    // Listen for Metamask changes
    this.listenForMetamaskChanges();
  }

  ngOnDestroy() {
    // Un-Listen Metamask changes
    this.listenForMetamaskChanges();
  }

  async init() {

    try {
      if (window.ethereum === undefined) {
        // Metamask not insalled
        this.isMetamaskInstalled = false;
        // Update interfaceEnabled
        this.interfaceEnabled = false;
        // Reset inerface
        this.resetInterface();
        // Alert Danger
        this.showAlertDanger("MetaMask NOT detected! Please innstall MetaMask.")
      } else {
        // Meamask is installed
        this.isMetamaskInstalled = true;
        this.web3 = new Web3(window.ethereum);
        this.netId = await this.web3.eth.net.getId();
        if (this.netId == 1) {
          this.networkName = "Ethereum Main Network (Mainnet)";
        } else if (this.netId == 5) {
          this.networkName = "Goerli Testnet Network";
        } else if (this.netId == 5777) {
          this.networkName = "Ganache (local blockchain)";
        } else {
          this.networkName = "Unknown Network";
        }
        if (this.netId != 5 && this.netId != 5777) {
          // Network not correct
          this.isNetworkCorrect = false;
          // Update interfaceEnabled
          this.interfaceEnabled = false;
          // Reset inerface
          this.resetInterface();
          // Alert Danger
          this.showAlertDanger("MetaMask NOT connected to Goerli Testnet Network or Ganache (local blockchain). Please choose one of those two networks in Your MetaMask.")
        } else {
          // Network is correct
          this.isNetworkCorrect = true;
          const accounts = await this.web3.eth.getAccounts();
          if (typeof accounts[0] === 'undefined') {
            // Site not connected
            this.isSiteConnected = false;
            // Update interfaceEnabled
            this.interfaceEnabled = false;
            // Reset inerface
            this.resetInterface();
            // Alert Danger
            this.showAlertDanger("This site is NOT connected to MetaMask. Please connect this site to Your MetaMask.")
          } else {
            // Site is connected
            this.isSiteConnected = true;
            this.accountAddress = accounts[0];
            const accountBalance = await this.web3.eth.getBalance(accounts[0]);
            this.accountBalance = this.web3.utils.fromWei(accountBalance);
            try {
              // SimpleFundContract contract
              this.simpleFundContractObject = new this.web3.eth.Contract(SimpleFundContractJson.abi as AbiItem[], SimpleFundContractJson.networks[this.netId].address);
              this.simpleFundContractAddress = this.simpleFundContractObject.options.address;
              const simpleFundContractBalance = await this.web3.eth.getBalance(this.simpleFundContractAddress);
              this.simpleFundContractBalance = this.web3.utils.fromWei(simpleFundContractBalance);
              // PriceConsumerV3 contract
              this.priceConsumerV3Object = new this.web3.eth.Contract(PriceConsumerV3Json.abi as AbiItem[], PriceConsumerV3Json.networks[this.netId].address);
              // Get current ETH/USD price
              await this.getEthUsdPrice(8);
              // Get list of funders
              await this.getFunders();
              // Reset transaction history
              this.transactions = [];
              // Update interfaceEnabled
              this.interfaceEnabled = true;
              // Get transaction history (another way to check blocks for transactions)
              // this.getTransactionsHistory(this.simpleFundContractAddress, this.numberOfBlocksToCheck);
              // Get past events
              this.getPastEvents(this.simpleFundContractObject, "Fund", this.numberOfBlocksToCheck);
            } catch (e) {
              // Update interfaceEnabled
              this.interfaceEnabled = false;
              // Reset inerface
              this.resetInterface();
              // Alert Danger
              this.showAlertDanger("Contracts are NOT deployed to this network or there was a problem interacting with contracts.")
            }
          }
        }
      }
    } catch (e) {
      this.handleInitError(e);
    }

  }

  async getEthUsdPrice(decimals: number) {
    try {
      if (this.priceConsumerV3Object) {
        try {
          const price = await this.priceConsumerV3Object.methods.getLatestPrice().call();
          this.price = BigNumber(price).div(new BigNumber(10).pow(decimals)).toString();
          this.priceRounded = (Math.round((parseFloat(this.price)) * 100) / 100).toString();
        } catch (e) {
          // Alert Danger
          this.showAlertDanger("There was a problem with getting latest price from PriceConsumerV3 contract.")
        }
      }
    } catch (e) {
      // Alert Danger
      this.showAlertDanger("Contracts are NOT deployed to this network or there was a problem interacting with PriceConsumerV3 contract.")
    }
  }

  async getFunders() {
    try {
      if (this.simpleFundContractObject) {
        try {
          const funders = await this.simpleFundContractObject.methods.getFunders().call();
          // To reverse the array order we use slice() method because otherwise we get
          // an error TypeError: 0 is read-only (indicating that we are trying to change
          // an immutable array). Argument inside slice() is just number of latest funders
          // we want to return to our this.funders array, nothing more. If we want to reverse
          // and return the whole array we would use slice() without arguments.
          this.funders = funders.slice((-1) * this.numberOfLatestFunders).reverse();
        } catch (e) {
          // Alert Danger
          this.showAlertDanger("There was a problem with getting funders from SimpleFundContractObject contract.")
        }
      }
    } catch (e) {
      // Alert Danger
      this.showAlertDanger("Contracts are NOT deployed to this network or there was a problem interacting with SimpleFundContractObject contract.")
    }
  }

  async onFundClick() {
    if (this.ethFundAmount == "" || parseFloat(this.ethFundAmount) <= 0 || parseFloat(this.ethFundAmount).toString() == "NaN") {
      // Alert Danger
      this.showAlertDanger("Amount has to be number greater than zero.")
    } else {
      try {
        if (this.simpleFundContractObject) {
          try {
            // Update interfaceEnabled
            this.interfaceEnabled = false;
            // Update transactionInProgress
            this.isTransactionInProgress = true;
            // Update transactionText
            this.transactionText = "Waiting for transaction response...";
            // Begin transaction (no "await" because we want to listen to transaction stages in the next line)
            const transactionResponse = this.simpleFundContractObject.methods.fund().send({ value: this.web3.utils.toWei(this.ethFundAmount), from: this.accountAddress });
            // Listen for transaction stages until receipt is ready
            try {
              const receipt = await this.listenForTransactionMine(transactionResponse);
              // Once receipt was returned successfully, update balances
              this.transactionText = "Completed!";
              // Update SimpleFundContract balance
              const simpleFundContractBalance = await this.web3.eth.getBalance(this.simpleFundContractAddress);
              this.simpleFundContractBalance = this.web3.utils.fromWei(simpleFundContractBalance);
              // Update Account Balance
              const accountBalance = await this.web3.eth.getBalance(this.accountAddress);
              this.accountBalance = this.web3.utils.fromWei(accountBalance);
              // Update list of contract funders
              await this.getFunders();
              // Update interfaceEnabled
              this.interfaceEnabled = true;
              // Update transactionInProgress
              this.isTransactionInProgress = false;
              // Push new transaction to array (to the first position because we want array to stay reversed)
              this.transactions.unshift({ hash: receipt.transactionHash, from: receipt.from, to: receipt.to, value: this.web3.utils.toWei(this.ethFundAmount) });
              // Remove last array element if needed
              if (this.transactions.length > this.numberOfLatestTransactions) {
                this.transactions = this.transactions.slice(0, this.numberOfLatestTransactions);
              }
              // Alert Success
              this.showAlertSuccess("Transaction successfully completed with hash " + receipt.transactionHash);
              // Show and hide transaction text
              setTimeout(() => {
                this.transactionText = "";
              }, this.ALERT_TIMEOUT);
            }
            catch (e) {
              this.handleTransactionError(e);
            }
          } catch (e) {
            this.handleTransactionError(e);
          }
        }
      } catch (e) {
        // Alert Danger
        this.showAlertDanger("Contracts are NOT deployed to this network or there was a problem interacting with SimpleFundContract contract.")
      }
    }
  }

  // async getTransactionsHistory(address: string, numberOfBlocks: number = 1) {

  //   let currentBlockNumber = await this.web3.eth.getBlockNumber();
  //   let startBlockNumber = currentBlockNumber - numberOfBlocks + 1;

  //   for (let blockNumber = startBlockNumber; blockNumber <= currentBlockNumber; blockNumber++) {
  //     //Show transaction text
  //     this.transactionText = `Checking block ${blockNumber} (${blockNumber - startBlockNumber + 1} / ${numberOfBlocks})`;
  //     let block = await this.web3.eth.getBlock(blockNumber);
  //     if (block && block.transactions) {
  //       for (let txHash of block.transactions) {
  //         let tx = await this.web3.eth.getTransaction(txHash);
  //         if (tx && tx.from && tx.to && tx.value && address.toLowerCase() == tx.to.toLowerCase()) {
  //           this.transactions.push({ hash: txHash, from: tx.from, to: tx.to, value: tx.value });
  //         }
  //       }
  //     }
  //   }

  //   // Hide transaction text
  //   this.transactionText = "";

  //   // Get only needed number of transactions and reverse array
  //   this.transactions = this.transactions.slice((-1) * this.numberOfLatestTransactions).reverse();

  // }

  async getPastEvents(contract: any, eventName: string, numberOfBlocks: number = 0) {

    let currentBlockNumber = 0;
    let startBlockNumber = 0;

    // Calculate start block number
    if (numberOfBlocks <= 0) {
      startBlockNumber = 0;
    } else {
      try {
        currentBlockNumber = await this.web3.eth.getBlockNumber();
        startBlockNumber = currentBlockNumber - numberOfBlocks + 1;
        if (startBlockNumber < 0) {
          startBlockNumber = 0;
        }
      } catch (e) {
        this.handlePastEventsError(e);
      }
    }

    // Show transaction text
    this.transactionText = "Checking history...";

    contract.getPastEvents(eventName, { fromBlock: startBlockNumber, toBlock: "latest" })
      .then((events: any) => {
        // Loop through all relevant events and extract needed data
        for (let ev of events) {
          if (ev && ev.returnValues["_from"] && ev.returnValues["_to"] && ev.returnValues["_value"]) {
            this.transactions.push({ hash: ev.transactionHash, from: ev.returnValues["_from"], to: ev.returnValues["_to"], value: ev.returnValues["_value"] });
          }
        }
        // Hide transaction text
        this.transactionText = "";
        // Get only needed number of transactions and reverse array
        this.transactions = this.transactions.slice((-1) * this.numberOfLatestTransactions).reverse();
      })
      .catch((e: any) => this.handlePastEventsError(e))

  }

  listenForTransactionMine(transactionResponse): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        transactionResponse
          .once('receipt', function (receipt) { resolve(receipt); })
          .on('error', function (error) { reject(error); })
      } catch (error) {
        reject(error);
      }
    })
  }

  listenForMetamaskChanges() {

    // If network change is detected, there is no need to check for account change also because
    // init() will take care of everything anyways. Only if network is same as before we can
    // check if account is changed

    this.renderer.listen('window', 'focus', event => {

      this.web3.eth.net.getId()
        .then((netId) => {
          if (netId != this.netId) {
            if (!this.isTransactionInProgress) {
              this.focusChanged = true;
              this.interfaceEnabled = false;
              this.init()
                .then(() => { this.focusChanged = false; this.showAlertInfo("Selected network changed in MetaMask!"); })
                .catch(() => { this.focusChanged = false; this.interfaceEnabled = false })
            }
          } else {
            this.web3.eth.getAccounts()
              .then((accounts) => {
                if (accounts[0] != this.accountAddress) {
                  if (!this.isTransactionInProgress) {
                    this.focusChanged = true;
                    this.interfaceEnabled = false;
                    this.init()
                      .then(() => { this.focusChanged = false; this.showAlertInfo("Selected account changed in MetaMask!"); })
                      .catch(() => { this.focusChanged = false; this.interfaceEnabled = false })
                  }
                }
              });
          }
        });

    });

  }

  resetInterface() {
    this.accountAddress = "";
    this.accountBalance = "0";
    this.simpleFundContractBalance = "0";
    this.ethFundAmount = "0.1";
    this.funders = [];
    this.transactions = [];
  }

  showAlertDanger(text: string) {
    this.dangerAlertText = text;
    setTimeout(() => {
      this.dangerAlertText = "";
    }, this.ALERT_TIMEOUT);
  }

  showAlertSuccess(text: string) {
    this.successAlertText = text;
    setTimeout(() => {
      this.successAlertText = "";
    }, this.ALERT_TIMEOUT);
  }

  showAlertInfo(text: string) {
    this.infoAlertText = text;
    setTimeout(() => {
      this.infoAlertText = "";
    }, this.ALERT_TIMEOUT);
  }

  handleTransactionError(e: any) {
    // Update transactionText
    this.transactionText = "Error!";
    // Show and hide transaction text
    setTimeout(() => {
      this.transactionText = "";
    }, this.ALERT_TIMEOUT);
    // Update transactionInProgress
    this.isTransactionInProgress = false;
    // Update interfaceEnabled
    this.interfaceEnabled = true;
    // Alert Danger
    this.showAlertDanger(e.message);
  }

  handlePastEventsError(e: any) {
    // Update transactionInProgress
    this.isTransactionInProgress = false;
    // Update interfaceEnabled
    this.interfaceEnabled = true;
    // Alert Danger
    this.showAlertDanger(e.message);
  }

  handleInitError(e: any) {
    // Update transactionInProgress
    this.isTransactionInProgress = false;
    // Update interfaceEnabled
    this.interfaceEnabled = true;
    // Alert Danger
    this.showAlertDanger(e.message);
  }

  convertFromWei(value: string): string {
    return this.web3.utils.fromWei(value);
  }

  onHomeClick() {
    this.showHideSections(1);
  }

  onShowInfoClick() {
    this.showHideSections(2);
  }

  onGetStartedClick() {
    this.showHideSections(3);
  }

  showHideSections(index: number) {
    this.showWelcome = (index == 1);
    this.showInfo = (index == 2);
    this.showGeneral = (index == 3);
    this.showFunding = (index == 3);
    this.showTransactions = (index == 3);
  }

}

