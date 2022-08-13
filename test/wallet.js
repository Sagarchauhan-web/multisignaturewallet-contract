const { expectRevert } = require('@openzeppelin/test-helpers');

const Wallet = artifacts.require('Wallet');

contract('Wallet', (accounts) => {
  let wallet;
  beforeEach(async () => {
    wallet = await Wallet.new([accounts[0], accounts[1], accounts[2]], 2);
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: wallet.address,
      value: 1000,
    });
  });

  it('should have correct approvers and quorum', async () => {
    const approvers = await wallet.getApprovers();
    const quorum = await wallet.quorum();
    assert(approvers.length === 3);
    assert(approvers[0] === accounts[0]);
    assert(approvers[1] === accounts[1]);
    assert(approvers[2] === accounts[2]);
    assert(quorum.toNumber() === 2);
  });

  it('create an Transfer', async () => {
    await wallet.createTransfer(100, accounts[5], { from: accounts[0] });
    const transfers = await wallet.getTransfers();
    assert(transfers.length === 1);
    assert(transfers[0].id === '0');
    assert(transfers[0].sent === false);
    assert(transfers[0].amount === '100');
    assert(transfers[0].to === accounts[5]);
    assert(transfers[0].approvals === '0');
  });

  it('should not create transfers if sender not approver', async () => {
    await expectRevert(
      wallet.createTransfer(100, accounts[5], { from: accounts[8] }),
      'only approver allowed',
    );
  });

  it('should increment approvals', async () => {
    await wallet.createTransfer(100, accounts[5], { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    const transfers = await wallet.getTransfers();
    const balance = await web3.eth.getBalance(wallet.address);
    assert(transfers[0].sent === false);
    assert(transfers[0].approvals === '1');
    assert(balance === '1000');
  });

  it('should send transfer if quorum reached', async () => {
    const beforeBalance = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6]),
    );
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[1] });
    const afterBalance = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6]),
    );
    assert(afterBalance.sub(beforeBalance).toNumber() === 100);
  });

  it('should not approve transfer if sender not approver', async () => {
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await expectRevert(
      wallet.approveTransfer(0, { from: accounts[8] }),
      'only approver allowed',
    );
  });

  it('should not approve transfer if transfer already has sent', async () => {
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[1] });
    await expectRevert(
      wallet.approveTransfer(0, { from: accounts[2] }),
      'The Transfer is already sent',
    );
  });

  it('should not approve transfer twice', async () => {
    await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
    await wallet.approveTransfer(0, { from: accounts[0] });
    await expectRevert(
      wallet.approveTransfer(0, { from: accounts[0] }),
      'cant approve transfer twice',
    );
  });
});
