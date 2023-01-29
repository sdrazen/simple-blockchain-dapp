const SimpleFundContract = artifacts.require("SimpleFundContract")

module.exports = async (callback) => {
  const simpleFundContract = await SimpleFundContract.deployed()
  const funders = await simpleFundContract.getFunders()
  console.log(funders)
  callback()
}