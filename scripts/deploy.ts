import hre from "hardhat";

async function main() {
  console.log("Sect8: Deploying Agent Manager to 0G Chain...");

  const ethers = (hre as any).ethers;
  const Sect8AgentManager = await ethers.getContractFactory("Sect8AgentManager");
  const manager = await Sect8AgentManager.deploy();

  await manager.waitForDeployment();

  const address = await manager.getAddress();
  console.log(`Sect8: Agent Manager deployed to: ${address}`);
  console.log("Sect8: Update your .env file with this address!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
