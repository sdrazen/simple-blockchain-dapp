import { Component, OnInit, Renderer2 } from '@angular/core';
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
export class AppComponent implements OnInit {

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

  // PriceConsumerV3 contract
  priceConsumerV3Object: any;
  price: string = "";
  priceRounded: string = "";

  // Alerts
  ALERT_TIMEOUT: number = 10000;
  dangerAlertText: string = "";
  successAlertText: string = "";

  // Transactions
  transactionText: string = "";
  isTransactionInProgress: boolean = false;

  constructor(private renderer: Renderer2) { }

  async ngOnInit() {
    // Init
    await this.init();
    // Listen for Metamask changes
    this.listenForMetamaskChanges();
  }

  async init() {

    if (window.ethereum === undefined) {
      // Update interfaceEnabled
      this.interfaceEnabled = false;
      // Reset inerface
      this.resetInterface();
      // Alert Danger
      this.showAlertDanger("MetaMask NOT detected! Please innstall MetaMask.")
    } else {
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
        // Update interfaceEnabled
        this.interfaceEnabled = false;
        // Reset inerface
        this.resetInterface();
        // Alert Danger
        this.showAlertDanger("MetaMask NOT connected to Goerli Testnet Network or Ganache (local blockchain). Please choose one of those two networks in Your MetaMask.")
      } else {
        const accounts = await this.web3.eth.getAccounts();
        if (typeof accounts[0] === 'undefined') {
          // Update interfaceEnabled
          this.interfaceEnabled = false;
          // Reset inerface
          this.resetInterface();
          // Alert Danger
          this.showAlertDanger("This site is NOT connected to MetaMask. Please connect this site to Your MetaMask.")
        } else {
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
            // Update interfaceEnabled
            this.interfaceEnabled = true;
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
            // Begin transaction
            const transactionResponse = await this.simpleFundContractObject.methods.fund().send({ value: this.web3.utils.toWei(this.ethFundAmount), from: this.accountAddress });
            // Listen for receipt
            await this.listenForTransactionMine(transactionResponse, this.web3);
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
          } catch (e) {
            // Update transactionInProgress
            this.isTransactionInProgress = false;
            // Reset transaction text
            this.transactionText = "";
            // Alert Danger
            // this.showAlertDanger("There was a problem with funding SimpleFundContract contract.")
            this.showAlertDanger(e.message);
          }
        }
      } catch (e) {
        // Alert Danger
        this.showAlertDanger("Contracts are NOT deployed to this network or there was a problem interacting with SimpleFundContract contract.")
      }
    }
  }

  listenForTransactionMine(transactionResponse, provider: Web3) {
    this.transactionText = "Mining...";
    return new Promise<void>((resolve, reject) => {
      try {
        provider.eth.getTransactionReceipt(transactionResponse.transactionHash)
          .then(() => {
            this.transactionText = "Completed!";
            // Alert Success
            this.showAlertSuccess("Transaction successfully completed!");
            setTimeout(() => {
              this.transactionText = "";
            }, this.ALERT_TIMEOUT);
            resolve()
          })
      } catch (error) {
        this.transactionText = error;
        setTimeout(() => {
          this.transactionText = "";
        }, this.ALERT_TIMEOUT);
        reject();
      }
    })
  }

  listenForMetamaskChanges() {
    this.renderer.listen('window', 'focus', event => {
      if (!this.isTransactionInProgress) {
        this.focusChanged = true;
        this.interfaceEnabled = false;
        this.init()
          .then(() => { this.focusChanged = false })
          .catch(() => { this.focusChanged = false; this.interfaceEnabled = false })
      }
    });
  }

  resetInterface() {
    this.accountAddress = "";
    this.accountBalance = "0";
    this.simpleFundContractBalance = "0";
    this.ethFundAmount = "0.1";
    this.funders = [];
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

}

