// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClassAttendance {
    address public deployer;
    mapping(address => bool) public admins;
    mapping(address => bool) public professors;
    mapping(address => bool) public students;
    
    // Primary mapping: professor => student => date => time => present
    mapping(address => 
        mapping(address => 
            mapping(uint256 => 
                mapping(uint256 => bool)))) public attendanceRecords;
    
    // Secondary mapping for quick duplicate checks: student => date => time => present
    mapping(address => 
        mapping(uint256 => 
            mapping(uint256 => bool))) public globalAttendance;
    
    event AdminAdded(address indexed admin);
    event ProfessorAdded(address indexed professor);
    event StudentAdded(address indexed student);
    event AttendanceGiven(
        address indexed professor,
        address indexed student,
        uint256 date,
        uint256 time
    );
    
    error Unauthorized();
    error AlreadyRegistered();
    error InvalidDate();
    error InvalidTime();
    error AttendanceAlreadyRecorded();
    error DuplicateAttendance();
    
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
        _addAdmin(_admin);
    }
    
    function _addAdmin(address _admin) private {
        if (admins[_admin]|| professors[_admin]||students[_admin]) revert AlreadyRegistered();
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    function addProfessor(address _professor) external onlyAdmin {
        if (professors[_professor] || students[_professor]||admins[_professor]) 
            revert AlreadyRegistered();
        professors[_professor] = true;
        emit ProfessorAdded(_professor);
    }
    
    function addStudent(address _student) external onlyAdmin {
        if (students[_student] || professors[_student]||admins[_student]) 
            revert AlreadyRegistered();
        students[_student] = true;
        emit StudentAdded(_student);
    }

    function isValidDate(uint256 _date) internal pure returns (bool) {
        uint256 year = _date / 10000;
        uint256 month = (_date % 10000) / 100;
        uint256 day = _date % 100;
        
        if (year < 1900 || year > 2100) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        
        if ((month == 4 || month == 6 || month == 9 || month == 11) && day > 30) {
            return false;
        }
        
        if (month == 2) {
            if (day > 29) return false;
            if (day == 29) {
                if (year % 4 != 0) return false;
                if (year % 100 == 0 && year % 400 != 0) return false;
            }
        }
        return true;
    }
    
    function isValidTime(uint256 _time) internal pure returns (bool) {
        uint256 min = _time % 100;
        uint256 h = _time/100;
        return min < 60 && h<24 && h>=0 && min>=0;
    }
    
    function giveAttendance(
        address _student,
        uint256 _date,
        uint256 _time
    ) external onlyProfessor {
        // Validate inputs
        if (!isValidDate(_date)) revert InvalidDate();
        if (!isValidTime(_time)) revert InvalidTime();
        if (!students[_student]) revert Unauthorized();
        
        // Check if this professor already recorded attendance for this slot
        if (attendanceRecords[msg.sender][_student][_date][_time]) {
            revert AttendanceAlreadyRecorded();
        }
        
        // Check if attendance exists globally for this student/date/time
        if (globalAttendance[_student][_date][_time]) {
            revert DuplicateAttendance();
        }
        
        // Record attendance in both mappings
        attendanceRecords[msg.sender][_student][_date][_time] = true;
        globalAttendance[_student][_date][_time] = true;
        
        emit AttendanceGiven(msg.sender, _student, _date, _time);
    }
    
    // Check if a professor recorded attendance for a student
    function professorAttendance(
        address _professor,
        address _student,
        uint256 _date,
        uint256 _time
    ) external view returns (bool) {
        return attendanceRecords[_professor][_student][_date][_time];
    }
    
    // Check if attendance exists globally for a student
    function hasAttendance(
        address _student,
        uint256 _date,
        uint256 _time
    ) external view returns (bool) {
        return globalAttendance[_student][_date][_time];
    }
}