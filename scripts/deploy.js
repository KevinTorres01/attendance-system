const { ethers } = require("hardhat");

async function main() {
  const [deployer, admin, professor1, professor2, student1, student2] = await ethers.getSigners();
  
  console.log("Deploying contract with admin:", admin.address);

  const ClassAttendance = await ethers.getContractFactory("ClassAttendance");
  const contract = await ClassAttendance.deploy(admin.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("Contract deployed to:", address);

  // Add professors and students by admin
  await contract.connect(admin).addProfessor(professor1.address);
  await contract.connect(admin).addProfessor(professor2.address);
  await contract.connect(admin).addStudent(student1.address);
  await contract.connect(admin).addStudent(student2.address);

  console.log("=======================================================");
  console.log("🚀 Starting ClassAttendance Contract Deployment");
  console.log("=======================================================");

  // Set initial balances (using Hardhat network helpers)
  console.log("\n🔑 Setting initial balances...");
  for (const account of accounts) {
    await ethers.provider.send("hardhat_setBalance", [
      account.signer.address,
      account.initialBalance
    ]);
    const balance = await ethers.provider.getBalance(account.signer.address);
    console.log(`   Set ${account.name} balance to ${ethers.formatEther(balance)} ETH`);
  }

  // Deploy contract
  console.log("\n⚙️ Deploying ClassAttendance contract...");
  const ClassAttendance = await ethers.getContractFactory("ClassAttendance");
  const contract = await ClassAttendance.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ Contract deployed to:", address);

  // Add professors
  console.log("\n👨‍🏫 Adding professors...");
  await contract.addProfessor(professor1.address);
  await contract.addProfessor(professor2.address);
  console.log("   Added Professor 1:", professor1.address);
  console.log("   Added Professor 2:", professor2.address);

  // Add students
  console.log("\n👨‍🎓 Adding students...");
  await contract.connect(professor1).addStudent(student1.address);
  await contract.connect(professor1).addStudent(student2.address);
  console.log("   Added Student 1:", student1.address);
  console.log("   Added Student 2:", student2.address);

  // Record attendance and transfer 1 ETH per attendance
  console.log("\n📝 Recording attendance and transferring ETH...");

  // Helper to get YYYYMMDD date
  function getDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return parseInt(date.toISOString().slice(0, 10).replace(/-/g, ''));
  }

  const today = getDate(0);
  const yesterday = getDate(1);

  // Professor1 records today's attendance and transfers 1 ETH
  await professor1.sendTransaction({
    to: student1.address,
    value: ethers.parseEther("1")
  });
  await contract.connect(professor1).giveAttendance(student1.address, today);
  console.log(`   Professor 1 recorded attendance for Student 1 on ${today} and transferred 1 ETH`);

  // Professor1 records yesterday's attendance and transfers 1 ETH
  await professor1.sendTransaction({
    to: student1.address,
    value: ethers.parseEther("1")
  });
  await contract.connect(professor1).giveAttendance(student1.address, yesterday);
  console.log(`   Professor 1 recorded attendance for Student 1 on ${yesterday} and transferred 1 ETH`);

  // Professor2 records today's attendance and transfers 1 ETH
  await professor2.sendTransaction({
    to: student2.address,
    value: ethers.parseEther("1")
  });
  await contract.connect(professor2).giveAttendance(student2.address, today);
  console.log(`   Professor 2 recorded attendance for Student 2 on ${today} and transferred 1 ETH`);

  // Verify records
  console.log("\n🔍 Verifying attendance records...");
  const record1 = await contract.attendanceRecords(professor1.address, student1.address, today);
  const record2 = await contract.attendanceRecords(professor1.address, student1.address, yesterday);
  const record3 = await contract.attendanceRecords(professor2.address, student2.address, today);
  const record4 = await contract.attendanceRecords(professor2.address, student2.address, yesterday);

  console.log(`   Student 1 today, Professor1 class: ${record1 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Student 1 yesterday, Professor1 class: ${record2 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Student 2 today, Professor2 class: ${record3 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Student 2 yesterday, Professor2 class: ${record4 ? "✅ Present" : "❌ Absent"}`);

  // Show final balances
  console.log("\n💰 Final Balances:");
  for (const account of accounts) {
    const balance = await ethers.provider.getBalance(account.signer.address);
    console.log(`   ${account.name}: ${ethers.formatEther(balance)} ETH`);
  }

  // Final summary
  console.log("\n=======================================================");
  console.log("🎉 Deployment and Setup Complete!");
  console.log("=======================================================");
  console.log(`Contract Address: ${address}`);
  console.log(`Professors: ${professor1.address}, ${professor2.address}`);
  console.log(`Students: ${student1.address}, ${student2.address}`);
  console.log("Attendance Records: 3 created");
  console.log("ETH Transfers: 3 ETH transferred to students");
  console.log("=======================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("💥 Deployment Failed:", error);
    process.exit(1);
  });
