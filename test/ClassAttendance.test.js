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

describe("ClassAttendance Contract", () => {
  let owner, professor1, professor2, student1, student2, unauthorized;
  let contract;

  before(async () => {
    console.log("\n===== Starting Test Suite =====");
  });

  after(async () => {
    console.log("\n===== Test Suite Completed =====");
  });

  beforeEach(async function() {
    [owner, professor1, professor2, student1, student2, unauthorized] = await ethers.getSigners();
    
    const ClassAttendance = await ethers.getContractFactory("ClassAttendance");
    contract = await ClassAttendance.deploy();
    await contract.waitForDeployment();
    
    // Setup roles
    await contract.addProfessor(professor1.address);
    await contract.addProfessor(professor2.address);
    await contract.connect(professor1).addStudent(student1.address);
    await contract.connect(professor1).addStudent(student2.address);
  });

  describe("Deployment and Setup", () => {
    it("sets the correct owner", async () => {
      expect(await contract.owner()).to.equal(owner.address);
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

  describe("Role Management", () => {
    it("prevents adding duplicate professors", async () => {
      await expect(contract.addProfessor(professor1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding duplicate students", async () => {
      await expect(contract.connect(professor1).addStudent(student1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents students from becoming professors", async () => {
      await expect(contract.addProfessor(student1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents professors from becoming students", async () => {
      await expect(contract.connect(professor1).addStudent(professor1.address))
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
      await expect(contract.addProfessor(student1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("prevents adding a student who is already a professor", async () => {
      await expect(contract.connect(professor1).addStudent(professor1.address))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });
  });

  describe("Attendance Recording", () => {
    const today = getTodayDate();
    const yesterday = getPastDate(1);

    it("records attendance for a student", async () => {
      await expect(contract.connect(professor1).giveAttendance(student1.address, today))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, today);
      
      expect(await contract.attendanceRecords(
        professor1.address, 
        student1.address, 
        today
      )).to.be.true;
    });

    it("prevents duplicate attendance recording", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today);
      await expect(
        contract.connect(professor1).giveAttendance(student1.address, today)
      ).to.be.revertedWithCustomError(contract, "AttendanceAlreadyRecorded");
    });

    it("allows different dates for same professor/student", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today);
      await expect(contract.connect(professor1).giveAttendance(student1.address, yesterday))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, yesterday);
    });

    it("allows different professors for same student/date", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, today);
      await expect(contract.connect(professor2).giveAttendance(student1.address, today))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor2.address, student1.address, today);
    });

    it("prevents invalid date (0)", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(student1.address, 0)
      ).to.be.revertedWithCustomError(contract, "InvalidDate");
    });

    it("prevents recording for non-students", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(unauthorized.address, today)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("prevents non-professors from recording attendance", async () => {
      await expect(
        contract.connect(unauthorized).giveAttendance(student1.address, today)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });
  });

  describe("Edge Cases", () => {
    it("handles multiple attendance records", async () => {
      const dates = [getPastDate(5), getPastDate(3), getTodayDate()];
      
      for (const date of dates) {
        await contract.connect(professor1).giveAttendance(student1.address, date);
        expect(await contract.attendanceRecords(
          professor1.address, 
          student1.address, 
          date
        )).to.be.true;
      }
    });

    it("prevents self-attendance by professors", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(professor1.address, getTodayDate())
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("allows professor to record for multiple students", async () => {
      await contract.connect(professor1).giveAttendance(student1.address, getTodayDate());
      await contract.connect(professor1).giveAttendance(student2.address, getTodayDate());
      
      expect(await contract.attendanceRecords(
        professor1.address, 
        student1.address, 
        getTodayDate()
      )).to.be.true;
      
      expect(await contract.attendanceRecords(
        professor1.address, 
        student2.address, 
        getTodayDate()
      )).to.be.true;
    });

    it("prevents attendance recording for unregistered students", async () => {
      await expect(
        contract.connect(professor1).giveAttendance(unauthorized.address, getTodayDate())
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("accepts valid dates", async () => {
      const validDates = [20230615, 20200229, 20231231, getFutureDate(1)];
      
      for (const date of validDates) {
        await contract.connect(professor1).giveAttendance(student1.address, date);
        expect(await contract.attendanceRecords(
          professor1.address, 
          student1.address, 
          date
        )).to.be.true;
      }
    });
  });

  describe("Event Logging", () => {
    it("emits ProfessorAdded event", async () => {
      await expect(contract.addProfessor(unauthorized.address))
        .to.emit(contract, "ProfessorAdded")
        .withArgs(unauthorized.address);
    });

    it("emits StudentAdded event", async () => {
      await expect(contract.connect(professor1).addStudent(unauthorized.address))
        .to.emit(contract, "StudentAdded")
        .withArgs(unauthorized.address);
    });

    it("emits AttendanceGiven event", async () => {
      const date = getTodayDate();
      await expect(contract.connect(professor1).giveAttendance(student1.address, date))
        .to.emit(contract, "AttendanceGiven")
        .withArgs(professor1.address, student1.address, date);
    });
  });
});
