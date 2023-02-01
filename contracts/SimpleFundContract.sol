// SPDX-License-Identifier: MIT

// Pragme
pragma solidity ^0.8.7;

// Imports

// Error codes
error SimpleFundContract__NotOwner();

// Interfaces, Libraries, Contracts

contract SimpleFundContract {

    // Type Declarations

    // State Variables
    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;
    address private immutable i_owner;

    // Events
    event Fund(address indexed _from, address indexed _to, uint256 _value);

    // Modifiers
    modifier onlyOwner {
        if (msg.sender != i_owner) revert SimpleFundContract__NotOwner();
        _;
    }

    ////////////
    // Functions
    ////////////

    // Constructor
    constructor() {
        i_owner = msg.sender;
    }

    // Receive, Fallback
    //
    // If someone sends ETH to this contract without calling the fund() function,
    // the fund() function will be called anyway through receive() and fallback()
    // special functions
    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    // External

    // Public
    function fund() public payable {
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] = msg.value;
        emit Fund(msg.sender, address(this), msg.value);
    }

    function withdraw() public onlyOwner {

        for (uint256 funderIndex = 0; funderIndex < s_funders.length; funderIndex++) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }

        // Reset the array with 0 addresses in it
        s_funders = new address[](0);

        /////////////////////////////////////
        // // Three ways to make transactions
        /////////////////////////////////////
        // // Transfer
        // payable(msg.sender).transfer(address(this).balance);
        // // Send
        // bool sendSuccess = payable(msg.sender).transfer(address(this).balance);
        // require(sendSuccess, "Send failed!");
        // Call
        (bool callSuccess, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(callSuccess, "Call failed!");
    }

    function cheaperWithdraw() public onlyOwner {

        // Instead of constantly reading from storage (expensive), we read
        // only once and put the data into memory (lot cheaper). Then we will
        // read from memory instead from storage
        address[] memory funders = s_funders;

        for (uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++) {
            address funder = funders[funderIndex];
            // Mapping cannot be in memory, so we continue as before. No way around it.
            s_addressToAmountFunded[funder] = 0;
        }

        // Reset the array with 0 addresses in it
        s_funders = new address[](0);

        /////////////////////////////////////
        // // Three ways to make transactions
        /////////////////////////////////////
        // // Transfer
        // payable(msg.sender).transfer(address(this).balance);
        // // Send
        // bool sendSuccess = payable(msg.sender).transfer(address(this).balance);
        // require(sendSuccess, "Send failed!");
        // Call
        (bool callSuccess, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(callSuccess, "Call failed!");
    }

    // Internal

    // Private

    // View, Pure
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getFunders() public view returns (address[] memory) {
        return s_funders;
    }

    function getAddressToAmountFunded(address funder) public view returns(uint256) {
        return s_addressToAmountFunded[funder];
    }

}