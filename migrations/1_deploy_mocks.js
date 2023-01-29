const MockV3Aggregator = artifacts.require("MockV3Aggregator")
const { developmentChains } = require("../helper-truffle-config")

const DECIMALS = "18"
const INITIAL_PRICE = "200000000000000000000"

module.exports = async function (deployer, network) {
    if (developmentChains.includes(network)) {
        console.log("Deploying Mocks...")
        await deployer.deploy(MockV3Aggregator, DECIMALS, INITIAL_PRICE)
        console.log("Mocks Deployed!")
    } else {
        console.log("Skipping Mocks Deployment...")
    }
}
