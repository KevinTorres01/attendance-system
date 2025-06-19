const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper to get YYYYMMDD date
function getTodayDate() {
  const date = new Date();
  return parseInt(
    date.toISOString().slice(0,10).replace(/-/g, '')
  );
}

// Helper to get past date
function getPastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return parseInt(
    date.toISOString().slice(0,10).replace(/-/g, '')
  );
}

// Helper to get future date
function getFutureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return parseInt(
    date.toISOString().slice(0,10).replace(/-/g, '')
  );
}

// Helper to get current time in HHMM format
function getCurrentTime() {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return parseInt(hours + minutes);
}

describe("ClassAttendance Contract", () => {
  let deployer, admin, professor1, professor2, student1, student2, unauthorized;
  let contract;

  before(async () => {
    console.log("\n===== Starting Test Suite =====");
  });

  after(async () => {
    console.log("\n===== Test Suite Completed =====");
  });

  beforeEach(async function() {
    [deployer, admin, professor1, professor2, student1, student2, unauthorized] = await ethers.getSigners();
    
    const ClassAttendance = await ethers.getContractFactory("ClassAttendance");
    contract = await ClassAttendance.deploy(admin.address);
    await contract.waitForDeployment();
    
    // Setup roles by admin
    await contract.connect(admin).addProfessor(professor1.address);
    await contract.connect(admin).addProfessor(professor2.address);
    await contract.connect(admin).addStudent(student1.address);
    await contract.connect(admin).addStudent(student2.address);
  });

  describe("Deployment and Setup", () => {
    it("sets the correct deployer", async () => {
      expect(await contract.deployer()).to.equal(deployer.address);
    });

    it("sets the initial admin", async () => {
      expect(await contract.admins(admin.address)).to.be.true;
    });

    it("has initial professors", async () => {
      expect(await contract.professors(professor1.address)).to.be.true;
      expect(await contract.professors(professor2.address)).to.be.true;
    });

    it("has initial students", async () => {
      expect(await contract.students(student1.address)).to.be.true;
      expect(await contract.students(student2.address)).to.be.true;
    });
  });

  describe("Admin Management", () => {
    it("allows deployer to add new admins", async () => {
      await expect(contract.connect(deployer).addAdmin(unauthorized.address))
        .to.emit(contract, "AdminAdded")
        .withArgs(unauthorized.address);
      
      expect(await contract.admins(unauthorized.address)).to.be.true;
    });

    it("prevents non-deployers from adding admins", async () => {
      await expect(contract.connect(admin).addAdmin(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "Unauthorized");
      
      await expect(contract.connect(professor1).addAdmin(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("prevents adding duplicate admins", async () => {
      await contract.connect(deployer).addAdmin(unauthorized.address);
      await expect(contract.connect(deployer).addAdmin(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding professors as admins if already registered", async () => {
      await expect(contract.connect(deployer).addAdmin(professor1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding students as admins if already registered", async () => {
      await expect(contract.connect(deployer).addAdmin(student1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });
  });

  describe("Role Management", () => {
    it("prevents adding duplicate professors", async () => {
      await expect(contract.connect(admin).addProfessor(professor1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding duplicate students", async () => {
      await expect(contract.connect(admin).addStudent(student1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding admins as professors", async () => {
      await contract.connect(deployer).addAdmin(unauthorized.address);
      await expect(contract.connect(admin).addProfessor(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding admins as students", async () => {
      await contract.connect(deployer).addAdmin(unauthorized.address);
      await expect(contract.connect(admin).addStudent(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents unauthorized users from adding professors", async () => {
      await expect(contract.connect(unauthorized).addProfessor(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("prevents unauthorized users from adding students", async () => {
      await expect(contract.connect(unauthorized).addStudent(unauthorized.address))
        .to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("prevents adding a professor who is already a student", async () => {
      await expect(contract.connect(admin).addProfessor(student1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding a student who is already a professor", async () => {
      await expect(contract.connect(admin).addStudent(professor1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });
  });

  describe("Attendance Recording", () => {
    const today = getTodayDate();
    const yesterday = getPastDate(1);
    const time1 = 900; // 9:00 AM
    const time2 = 1000; // 10:00 AM

    it("records attendance for a student", async () => {
      await expect(contract.connect(professor1).giveAttendance(student1.address, today, time1))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, today, time1);
      
      expect(await contract.professorAttendance(
        professor1.address, 
        student1.address, 
        today,
        time1
      )).to.be.true;
    });

    it("prevents duplicate attendance recording by same professor", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today, time1);
      await expect(
        contract.connect(professor1).giveAttendance(student1.address, today, time1)
      ).to.be.revertedWithCustomError(contract, "AttendanceAlreadyRecorded");
    });

    it("prevents duplicate attendance by different professor for same student/date/time", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today, time1);
      await expect(
        contract.connect(professor2).giveAttendance(student1.address, today, time1)
      ).to.be.revertedWithCustomError(contract, "DuplicateAttendance");
    });

    it("allows different dates for same professor/student", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today, time1);
      await expect(contract.connect(professor1).giveAttendance(student1.address, yesterday, time1))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, yesterday, time1);
    });

    it("allows different times for same professor/student/date", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today, time1);
      await expect(contract.connect(professor1).giveAttendance(student1.address, today, time2))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, today, time2);
    });

    it("allows different professors for same student/date with different times", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today, time1);
      await expect(contract.connect(professor2).giveAttendance(student1.address, today, time2))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor2.address, student1.address, today, time2);
    });

    it("prevents invalid dates", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(student1.address, 0, time1)
      ).to.be.revertedWithCustomError(contract, "InvalidDate");
    });

    it("prevents invalid times", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(student1.address, today, 2400)
      ).to.be.revertedWithCustomError(contract, "InvalidTime");
    });

    it("prevents recording for non-students", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(unauthorized.address, today, time1)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("prevents non-professors from recording attendance", async () => {
      await expect(
        contract.connect(unauthorized).giveAttendance(student1.address, today, time1)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });
  });

  describe("Edge Cases", () => {
    it("handles multiple attendance records", async () => {
      const dates = [getPastDate(5), getPastDate(3), getTodayDate()];
      const times = [900, 1000, 1100];
      
      for (let i = 0; i < dates.length; i++) {
        await contract.connect(professor1).giveAttendance(student1.address, dates[i], times[i]);
        expect(await contract.professorAttendance(
          professor1.address, 
          student1.address, 
          dates[i],
          times[i]
        )).to.be.true;
      }
    });

    it("prevents self-attendance by professors", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(professor1.address, getTodayDate(), 900)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("allows professor to record for multiple students", async () => {
      const time = 900;
      const date = getTodayDate();
      await contract.connect(professor1).giveAttendance(student1.address, date, time);
      await contract.connect(professor1).giveAttendance(student2.address, date, time);
      
      expect(await contract.professorAttendance(
        professor1.address, 
        student1.address, 
        date,
        time
      )).to.be.true;
      
      expect(await contract.professorAttendance(
        professor1.address, 
        student2.address, 
        date,
        time
      )).to.be.true;
    });

    it("prevents attendance recording for unregistered students", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(unauthorized.address, getTodayDate(), 900)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("accepts valid dates", async () => {
      const validDates = [20250615, 20240229, 20231231, getFutureDate(1)];
      const time = 900;
      
      for (const date of validDates) {
        await contract.connect(professor1).giveAttendance(student1.address, date, time);
        expect(await contract.professorAttendance(
          professor1.address, 
          student1.address, 
          date,
          time
        )).to.be.true;
      }
    });
  });

  describe("Event Logging", () => {
    it("emits AdminAdded event", async () => {
      await expect(contract.connect(deployer).addAdmin(unauthorized.address))
        .to.emit(contract, "AdminAdded")
        .withArgs(unauthorized.address);
    });

    it("emits ProfessorAdded event", async () => {
      await expect(contract.connect(admin).addProfessor(unauthorized.address))
        .to.emit(contract, "ProfessorAdded")
        .withArgs(unauthorized.address);
    });

    it("emits StudentAdded event", async () => {
      await expect(contract.connect(admin).addStudent(unauthorized.address))
        .to.emit(contract, "StudentAdded")
        .withArgs(unauthorized.address);
    });

    it("emits AttendanceGiven event", async () => {
      const date = getTodayDate();
      const time = getCurrentTime();
      await expect(contract.connect(professor1).giveAttendance(student1.address, date, time))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, date, time);
    });
  });
});