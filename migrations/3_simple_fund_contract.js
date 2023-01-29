const SimpleFundContract = artifacts.require("SimpleFundContract")

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(SimpleFundContract)
    const simpleFundContract = await SimpleFundContract.deployed()
    console.log("Simple Fund Contract Deployed!")
}
