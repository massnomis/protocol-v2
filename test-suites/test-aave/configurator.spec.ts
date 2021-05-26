import { TestEnv, makeSuite } from './helpers/make-suite';
import {
  APPROVAL_AMOUNT_LENDING_POOL,
  MAX_UINT_AMOUNT,
  RAY,
  MAX_BORROW_CAP,
} from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { ProtocolErrors } from '../../helpers/types';
import { strategyWETH } from '../../markets/aave/reservesConfigs';
import { BigNumber } from '@ethersproject/bignumber';

const { expect } = require('chai');

makeSuite('LendingPoolConfigurator', (testEnv: TestEnv) => {
  const {
    CALLER_NOT_POOL_ADMIN,
    LPC_RESERVE_LIQUIDITY_NOT_0,
    RC_INVALID_LTV,
    RC_INVALID_LIQ_THRESHOLD,
    RC_INVALID_LIQ_BONUS,
    RC_INVALID_DECIMALS,
    RC_INVALID_RESERVE_FACTOR,
    RC_INVALID_BORROW_CAP,
    RC_INVALID_SUPPLY_CAP,
    LPC_CALLER_NOT_EMERGENCY_OR_POOL_ADMIN,
    LPC_CALLER_NOT_RISK_OR_POOL_ADMIN,
    VL_RESERVE_PAUSED,
  } = ProtocolErrors;

  it('Reverts trying to set an invalid reserve factor', async () => {
    const { configurator, weth } = testEnv;

    const invalidReserveFactor = 65536;

    await expect(
      configurator.setReserveFactor(weth.address, invalidReserveFactor)
    ).to.be.revertedWith(RC_INVALID_RESERVE_FACTOR);
  });

  it('Deactivates the ETH reserve', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    await configurator.deactivateReserve(weth.address);
    const { isActive } = await helpersContract.getReserveConfigurationData(weth.address);
    expect(isActive).to.be.equal(false);
  });

  it('Rectivates the ETH reserve', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    await configurator.activateReserve(weth.address);

    const { isActive } = await helpersContract.getReserveConfigurationData(weth.address);
    expect(isActive).to.be.equal(true);
  });

  it('Check the onlyAaveAdmin on deactivateReserve ', async () => {
    const { configurator, users, weth } = testEnv;
    await expect(
      configurator.connect(users[2].signer).deactivateReserve(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Check the onlyAaveAdmin on activateReserve ', async () => {
    const { configurator, users, weth } = testEnv;
    await expect(
      configurator.connect(users[2].signer).activateReserve(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });
  it('Pauses the ETH reserve by pool admin', async () => {
    const { configurator, weth, helpersContract, addressesProvider, users } = testEnv;
    expect(await configurator.signer.getAddress()).to.be.equal(
      await addressesProvider.getPoolAdmin()
    );

    await configurator.pauseReserve(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Unpauses the ETH reserve by pool admin ', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.unpauseReserve(weth.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });
  it('Pauses the ETH reserve by emergency admin', async () => {
    const {
      configurator,
      weth,
      helpersContract,
      addressesProvider,
      users,
      emergencyAdmin,
    } = testEnv;
    await configurator.connect(emergencyAdmin.signer).pauseReserve(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Unpauses the ETH reserve by emergency admin ', async () => {
    const { configurator, helpersContract, weth, users, emergencyAdmin } = testEnv;
    await configurator.connect(emergencyAdmin.signer).unpauseReserve(weth.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Check the only admin or emergency admin can pauseReserve ', async () => {
    const { configurator, users, weth, riskAdmin } = testEnv;
    await expect(
      configurator.connect(riskAdmin.signer).pauseReserve(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_EMERGENCY_OR_POOL_ADMIN);
  });

  it('Check the only admin or emergency admin can unpauseReserve ', async () => {
    const { configurator, users, weth, riskAdmin } = testEnv;
    await expect(
      configurator.connect(riskAdmin.signer).unpauseReserve(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_EMERGENCY_OR_POOL_ADMIN);
  });

  it('Freezes the ETH reserve by pool Admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;

    await configurator.freezeReserve(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(true);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Unfreezes the ETH reserve by Pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.unfreezeReserve(weth.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });
  it('Freezes the ETH reserve by Risk Admin', async () => {
    const { configurator, weth, helpersContract, riskAdmin } = testEnv;

    await configurator.connect(riskAdmin.signer).freezeReserve(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(true);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Unfreezes the ETH reserve by Risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).unfreezeReserve(weth.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Check the onlyRiskOrPoolAdmins on freezeReserve ', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).freezeReserve(weth.address),
      LPC_CALLER_NOT_RISK_OR_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Check the onlyRiskOrPoolAdmins on unfreezeReserve ', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).unfreezeReserve(weth.address),
      LPC_CALLER_NOT_RISK_OR_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Deactivates the ETH reserve for borrowing via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.disableBorrowingOnReserve(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(false);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Activates the ETH reserve for borrowing via pool admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    await configurator.enableBorrowingOnReserve(weth.address, MAX_BORROW_CAP, true);
    const { variableBorrowIndex } = await helpersContract.getReserveData(weth.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);

    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Deactivates the ETH reserve for borrowing via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).disableBorrowingOnReserve(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(false);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Activates the ETH reserve for borrowing via risk admin', async () => {
    const { configurator, weth, helpersContract, riskAdmin } = testEnv;
    await configurator
      .connect(riskAdmin.signer)
      .enableBorrowingOnReserve(weth.address, MAX_BORROW_CAP, true);
    const { variableBorrowIndex } = await helpersContract.getReserveData(weth.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);

    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Check the onlyAaveAdmin or Risk admin on disableBorrowingOnReserve ', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;

    await expect(
      configurator.connect(emergencyAdmin.signer).disableBorrowingOnReserve(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Check the onlyAaveAdmin or Risk admin on enableBorrowingOnReserve ', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator
        .connect(emergencyAdmin.signer)
        .enableBorrowingOnReserve(weth.address, MAX_BORROW_CAP, true),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Deactivates the ETH reserve as collateral via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.configureReserveAsCollateral(weth.address, 0, 0, 0);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(18);
    expect(ltv).to.be.equal(0);
    expect(liquidationThreshold).to.be.equal(0);
    expect(liquidationBonus).to.be.equal(0);
    expect(stableBorrowRateEnabled).to.be.equal(true);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Activates the ETH reserve as collateral via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.configureReserveAsCollateral(weth.address, '8000', '8250', '10500');

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });
  it('Deactivates the ETH reserve as collateral via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator
      .connect(riskAdmin.signer)
      .configureReserveAsCollateral(weth.address, 0, 0, 0);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(18);
    expect(ltv).to.be.equal(0);
    expect(liquidationThreshold).to.be.equal(0);
    expect(liquidationBonus).to.be.equal(0);
    expect(stableBorrowRateEnabled).to.be.equal(true);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Activates the ETH reserve as collateral via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator
      .connect(riskAdmin.signer)
      .configureReserveAsCollateral(weth.address, '8000', '8250', '10500');

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Check the onlyRiskOrPoolAdmin on configureReserveAsCollateral ', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator
        .connect(emergencyAdmin.signer)
        .configureReserveAsCollateral(weth.address, '7500', '8000', '10500'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Disable stable borrow rate on the ETH reserve via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.disableReserveStableRate(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(false);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Enables stable borrow rate on the ETH reserve via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.enableReserveStableRate(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(true);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });
  it('Disable stable borrow rate on the ETH reserve risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).disableReserveStableRate(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(false);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Enables stable borrow rate on the ETH reserve risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).enableReserveStableRate(weth.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(true);
    expect(reserveFactor).to.be.equal(strategyWETH.reserveFactor);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Check the onlyRiskOrPoolAdmin on disableReserveStableRate', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).disableReserveStableRate(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Check the onlyRiskOrPoolAdmin on enableReserveStableRate', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).enableReserveStableRate(weth.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Check the onlyRiskOrPoolAdmin on setReserveFactor', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).setReserveFactor(weth.address, '1000'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Check the onlyRiskOrPoolAdmin on setBorrowCap', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).setBorrowCap(weth.address, '3000000000'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });
  it('Check the onlyRiskOrPoolAdmin on setSupplyCap', async () => {
    const { configurator, users, weth, emergencyAdmin } = testEnv;
    await expect(
      configurator.connect(emergencyAdmin.signer).setSupplyCap(weth.address, '3000000000'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(LPC_CALLER_NOT_RISK_OR_POOL_ADMIN);
  });

  it('Changes the reserve factor of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.setReserveFactor(weth.address, '1000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
    expect(reserveFactor).to.be.equal(1000);
  });
  it('Changes the reserve factor of WETH risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).setReserveFactor(weth.address, '1000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(borrowCap).to.be.equal(strategyWETH.borrowCap);
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
    expect(reserveFactor).to.be.equal(1000);
  });

  it('Fails to change to too high borrowCap', async () => {
    const { configurator, users, weth } = testEnv;
    await expect(
      configurator.setBorrowCap(weth.address, BigNumber.from(MAX_BORROW_CAP).add(1)),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(RC_INVALID_BORROW_CAP);
  });
  it('Fails to change to too high supplyCap', async () => {
    const { configurator, users, weth } = testEnv;
    await expect(
      configurator.setSupplyCap(weth.address, BigNumber.from(MAX_BORROW_CAP).add(1)),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(RC_INVALID_SUPPLY_CAP);
  });

  it('Changes the borrow Cap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.setBorrowCap(weth.address, '3000000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(1000);
    expect(borrowCap).to.be.equal('3000000');
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });
  it('Changes the borrow Cap of WETH risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).setBorrowCap(weth.address, '3000000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(1000);
    expect(borrowCap).to.be.equal('3000000');
    expect(supplyCap).to.be.equal(strategyWETH.supplyCap);
  });

  it('Changes the supply Cap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    await configurator.setSupplyCap(weth.address, '3000000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(1000);
    expect(borrowCap).to.be.equal('3000000');
    expect(supplyCap).to.be.equal('3000000');
  });
  it('Changes the supply Cap of WETH via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    await configurator.connect(riskAdmin.signer).setSupplyCap(weth.address, '3000000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(weth.address);
    const { borrowCap, supplyCap } = await helpersContract.getReserveCaps(weth.address);
    const isPaused = await helpersContract.getPaused(weth.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isPaused).to.be.equal(false);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWETH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWETH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWETH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWETH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWETH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(1000);
    expect(borrowCap).to.be.equal('3000000');
    expect(supplyCap).to.be.equal('3000000');
  });

  it('Reverts when trying to disable the DAI reserve with liquidity on it', async () => {
    const { dai, pool, configurator } = testEnv;
    const userAddress = await pool.signer.getAddress();
    await dai.mint(await convertToCurrencyDecimals(dai.address, '1000'));

    //approve protocol to access depositor wallet
    await dai.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    //user 1 deposits 1000 DAI
    await pool.deposit(dai.address, amountDAItoDeposit, userAddress, '0');

    await expect(
      configurator.deactivateReserve(dai.address),
      LPC_RESERVE_LIQUIDITY_NOT_0
    ).to.be.revertedWith(LPC_RESERVE_LIQUIDITY_NOT_0);
  });
  it('Register a new risk Admin', async () => {
    const { dai, pool, configurator, users, riskAdmin } = testEnv;
    await configurator.registerRiskAdmin(users[3].address);

    const isRiskAdminRegistered = await configurator.isRiskAdmin(riskAdmin.address);
    const isNewRegistered = await configurator.isRiskAdmin(users[3].address);
    expect(isNewRegistered).to.be.true;
    expect(isRiskAdminRegistered).to.be.true;
  });
  it('Unregister a risk Admins', async () => {
    const { dai, pool, configurator, users, riskAdmin } = testEnv;
    await configurator.unregisterRiskAdmin(users[3].address);
    await configurator.unregisterRiskAdmin(riskAdmin.address);

    const isRiskAdminRegistered = await configurator.isRiskAdmin(riskAdmin.address);
    const isNewRegistered = await configurator.isRiskAdmin(users[3].address);
    expect(isNewRegistered).to.be.false;
    expect(isRiskAdminRegistered).to.be.false;
  });
});
