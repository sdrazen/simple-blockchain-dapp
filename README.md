# Simple Blockchain Dapp

This simple blockchain decentralized application is a showcase on how to create smart contracts on blockchain and interact with them throught web3 applications. In this app You can fund a real smart contract with some fake ETH from Your MetaMask wallet. Smart contracts exist on Goerli Test Network but You can also use Ganache (local blockchahin) to interact with those same smart contracts.

Feel free to use or modify this code in any way you like.

## Installing

```bash
cd simple-blockchain-dapp
npm install
```

## Getting started

As this application was written in Typescript (Angular), You can start it like so:

```bash
ng serve
```

Smart contract are already deployed on Goerli Test Network but You can deploy them to Ganache with truffle:

```bash
truffle migrate
```

Note that we avoided any arguments with this command. In that case smart contracts will be deployed to Ganache by default. Of course, Your Ganache has to be up-and-running and ready for smart contract to be deployed successfully.

On the other hand, if You use a _`--network`_ argument, contracts will be deployed to that network:

```bash
truffle migrate --network goerli
```

If You want to redeploy or create some new smart contracts to "real" test networks like Goerli, You will have to provide MNEMONIC for Your MetaMask accounts and INFURA-KEY (if You use Infura) in _`truffle-config.js`_ located in the root of this project.

## Usage

Choose Your preferred test network in MetaMask, input some fake ETH and click _`Fund`_ button. Observe how Your account balance decreases by that fund amount and how Your address appears in the "Latest contract funders" list on the right hand side. At the same time the smart contract's balance increases by the same amount.

This code is also a good example on how to use Chainlink for decentralized applications to be able to communicate with "outside data". This application uses AggregatorV3Interface to get latest ETH/USD price.

## Live application

This application is live on the cloud and can be seen [here](https://simple-blockchain-dapp.web.app/).
