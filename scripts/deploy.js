const { ethers } = require("hardhat");

// Helper function to set balances
async function setBalance(address, ethAmount) {
  const weiAmount = ethers.parseEther(ethAmount.toString());
  await ethers.provider.send("hardhat_setBalance", [
    address,
    ethers.toBeHex(weiAmount)
  ]);
}

async function main() {
  const [deployer, admin, professor1, professor2, student1, student2] = await ethers.getSigners();

  console.log("Deploying contract with admin:", admin.address);

  const ClassAttendanceFactory = await ethers.getContractFactory("ClassAttendance");
  const contract = await ClassAttendanceFactory.deploy(admin.address);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("Contract deployed to:", address);

  // Add professors
  console.log("\n👨‍🏫 Adding professors...");
  await contract.connect(admin).addProfessor(professor1.address);
  await contract.connect(admin).addProfessor(professor2.address);
  console.log("   Added Professor 1:", professor1.address);
  console.log("   Added Professor 2:", professor2.address);

  // Add students
  console.log("\n👨‍🎓 Adding students...");
  await contract.connect(admin).addStudent(student1.address);
  await contract.connect(admin).addStudent(student2.address);
  console.log("   Added Student 1:", student1.address);
  console.log("   Added Student 2:", student2.address);
  
  // Set initial balances
  console.log("\n🔧 Setting initial balances...");
  await setBalance(admin.address, 10000);       // 10,000 ETH
  await setBalance(professor1.address, 20000);  // 20,000 ETH
  await setBalance(professor2.address, 20000);  // 20,000 ETH
  await setBalance(student1.address, 0);        // 0 ETH
  await setBalance(student2.address, 0);        // 0 ETH

  // Record attendance and transfer ETH
  console.log("\n📝 Recording attendance and transferring ETH...");

  // Helper to get YYYYMMDD date
  function getDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return parseInt(date.toISOString().slice(0, 10).replace(/-/g, ''));
  }

  const today = getDate(0);
  const yesterday = getDate(1);
  const time1 = 900; // 9:00 AM
  const time2 = 1000; // 10:00 AM

  // Professor1 records today's attendance and transfers 1 ETH
  await professor1.sendTransaction({
    to: student1.address,
    value: ethers.parseEther("1")
  });
  await contract.connect(professor1).giveAttendance(student1.address, today, time1);
  console.log(`   Professor 1 recorded attendance for Student 1 on ${today} at ${time1} and transferred 1 ETH`);

  // Professor1 records yesterday's attendance and transfers 1 ETH
  await professor1.sendTransaction({
    to: student1.address,
    value: ethers.parseEther("1")
  });
  await contract.connect(professor1).giveAttendance(student1.address, yesterday, time2);
  console.log(`   Professor 1 recorded attendance for Student 1 on ${yesterday} at ${time2} and transferred 1 ETH`);

  // Professor2 records today's attendance and transfers 1 ETH
  await professor2.sendTransaction({
    to: student2.address,
    value: ethers.parseEther("1")
  });
  await contract.connect(professor2).giveAttendance(student2.address, today, time1);
  console.log(`   Professor 2 recorded attendance for Student 2 on ${today} at ${time1} and transferred 1 ETH`);

  // Verify records
  console.log("\n🔍 Verifying attendance records...");
  
  // Check professor-specific records
  const record1 = await contract.professorAttendance(professor1.address, student1.address, today, time1);
  const record2 = await contract.professorAttendance(professor1.address, student1.address, yesterday, time2);
  const record3 = await contract.professorAttendance(professor2.address, student2.address, today, time1);
  
  // Check global attendance
  const global1 = await contract.hasAttendance(student1.address, today, time1);
  const global2 = await contract.hasAttendance(student1.address, yesterday, time2);
  const global3 = await contract.hasAttendance(student2.address, today, time1);

  console.log(`   Student 1 today at ${time1}, Professor1 class: ${record1 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Student 1 yesterday at ${time2}, Professor1 class: ${record2 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Student 2 today at ${time1}, Professor2 class: ${record3 ? "✅ Present" : "❌ Absent"}`);
  
  console.log(`\n   Global attendance for Student 1 today at ${time1}: ${global1 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Global attendance for Student 1 yesterday at ${time2}: ${global2 ? "✅ Present" : "❌ Absent"}`);
  console.log(`   Global attendance for Student 2 today at ${time1}: ${global3 ? "✅ Present" : "❌ Absent"}`);

  // Show final balances
  console.log("\n💰 Final Balances:");
  const accounts = [
    { name: "Deployer", signer: deployer },
    { name: "Admin", signer: admin },
    { name: "Professor 1", signer: professor1 },
    { name: "Professor 2", signer: professor2 },
    { name: "Student 1", signer: student1 },
    { name: "Student 2", signer: student2 }
  ];

  for (const account of accounts) {
    const balance = await ethers.provider.getBalance(account.signer.address);
    console.log(`   ${account.name}: ${ethers.formatEther(balance)} ETH`);
  }

  console.log("\n=======================================================");
  console.log("🎉 Deployment Complete!");
  console.log("=======================================================");
  console.log(`Contract Address: ${address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Professors: ${professor1.address}, ${professor2.address}`);
  console.log(`Students: ${student1.address}, ${student2.address}`);
  console.log("=======================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("💥 Deployment Failed:", error);
    process.exit(1);
  });