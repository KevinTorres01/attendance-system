// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClassAttendance {
    address public deployer;
    mapping(address => bool) public admins;
    mapping(address => bool) public professors;
    mapping(address => bool) public students;
    mapping(address => mapping(address => mapping(uint256 => bool))) public attendanceRecords;
    
    event AdminAdded(address indexed admin);
    event ProfessorAdded(address indexed professor);
    event StudentAdded(address indexed student);
    event AttendanceGiven(
        address indexed professor,
        address indexed student,
        uint256 date
    );
    
    error Unauthorized();
    error AlreadyRegistered();
    error InvalidDate();
    error AttendanceAlreadyRecorded();
    
    modifier onlyAdmin() {
        if (!admins[msg.sender]) revert Unauthorized();
        _;
    }
    
    modifier onlyProfessor() {
        if (!professors[msg.sender]) revert Unauthorized();
        _;
    }
    
    constructor(address _initialAdmin) {
        deployer = msg.sender;
        _addAdmin(_initialAdmin);
    }
    
    function addAdmin(address _admin) external {
        if (msg.sender != deployer) revert Unauthorized();
        if (students[_admin] || professors[_admin]) revert AlreadyRegistered();
        _addAdmin(_admin);
    }
    
    function _addAdmin(address _admin) private {
        if (admins[_admin]) revert AlreadyRegistered();
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    function addProfessor(address _professor) external onlyAdmin {
        if (professors[_professor] || students[_professor]) 
            revert AlreadyRegistered();
        professors[_professor] = true;
        emit ProfessorAdded(_professor);
    }
    
    function addStudent(address _student) external onlyAdmin {
        if (students[_student] || professors[_student]) 
            revert AlreadyRegistered();
        students[_student] = true;
        emit StudentAdded(_student);
    }

    function isValidDate(uint256 _date) internal pure returns (bool) {
    uint256 year = _date / 10000;
    uint256 month = (_date % 10000) / 100;
    uint256 day = _date % 100;
    
    // Validación básica
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Validación de meses con 30 días
    if ((month == 4 || month == 6 || month == 9 || month == 11) && day > 30) {
        return false;
    }
    
    // Validación de febrero y años bisiestos
    if (month == 2) {
        if (day > 29) return false;
        if (day == 29) {
            // Reglas de año bisiesto
            if (year % 4 != 0) return false;
            if (year % 100 == 0 && year % 400 != 0) return false;
        }
    }
    return true;
}
    
    // Record attendance (only professor)
    function giveAttendance(address _student, uint256 _date) external onlyProfessor {
    if (!isValidDate(_date)) revert InvalidDate();
        if (!students[_student]) revert Unauthorized();
        if (attendanceRecords[msg.sender][_student][_date]) 
            revert AttendanceAlreadyRecorded();
        
        // Record attendance
        attendanceRecords[msg.sender][_student][_date] = true;
        emit AttendanceGiven(msg.sender, _student, _date);
    }
}
