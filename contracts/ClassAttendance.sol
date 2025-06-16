// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClassAttendance {
    address public owner;
    
    // Role management
    mapping(address => bool) public professors;
    mapping(address => bool) public students;
    
    // Attendance tracking (professor => student => date => exists)
    mapping(address => mapping(address => mapping(uint256 => bool))) public attendanceRecords;
    
    // Events
    event ProfessorAdded(address indexed professor);
    event StudentAdded(address indexed student);
    event AttendanceGiven(
        address indexed professor,
        address indexed student,
        uint256 date
    );
    
    // Error messages
    error Unauthorized();
    error AlreadyRegistered();
    error InvalidDate();
    error AttendanceAlreadyRecorded();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyProfessor() {
        if (!professors[msg.sender]) revert Unauthorized();
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // Add professor (only owner)
    function addProfessor(address _professor) external onlyOwner {
        if (professors[_professor] || students[_professor]) 
            revert AlreadyRegistered();
        
        professors[_professor] = true;
        emit ProfessorAdded(_professor);
    }
    
    // Add student (only professor)
    function addStudent(address _student) external onlyProfessor {
        if (students[_student] || professors[_student]) 
            revert AlreadyRegistered();
        
        students[_student] = true;
        emit StudentAdded(_student);
    }
    
    // Record attendance (only professor)
    function giveAttendance(
        address _student,
        uint256 _date
    ) external onlyProfessor {
        // Validate inputs
        if (_date == 0) revert InvalidDate();
        if (_date > 99999999) revert InvalidDate(); // YYYYMMDD max
        if (!students[_student]) revert Unauthorized();
        if (attendanceRecords[msg.sender][_student][_date]) 
            revert AttendanceAlreadyRecorded();
        
        // Record attendance
        attendanceRecords[msg.sender][_student][_date] = true;
        emit AttendanceGiven(msg.sender, _student, _date);
    }
}
