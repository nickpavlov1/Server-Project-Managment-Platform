/* eslint-disable prefer-const */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from 'src/auth/user.repository';
import { RegisterUserDTO } from 'src/models/dto/user/register-user.dto';
import { UserDTO } from 'src/models/dto/user/user.dto';
import * as bcrypt from 'bcrypt'
import { User } from 'src/database/entities/user.entity';
import { plainToClass } from 'class-transformer';
import { CreateEmployeeDTO } from '../models/dto/employee/create-employee.dto';
import { EmployeeRepository } from './employee.repository';
import { Employee } from '../database/entities/employee.entity';
import { EmployeeDTO } from '../models/dto/employee/employee.dto';
import { SkillRepository } from './skill.repository';
import { Skill } from 'src/database/entities/skill.entity';
import { SkillDTO } from 'src/models/dto/skill/skill.dto';
import { AddSkillDTO } from '../models/dto/skill/create-skill.dto';
import { WorkPosition } from '../models/enums/work-position.emun';
import { EditUserDTO } from 'src/models/dto/user/edit-user.dto';
import { EditEmployeeDTO } from 'src/models/dto/employee/edit-employee.dto';
import { EditAvatarUserDTO } from '../models/dto/user/edit-avatar.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminService {
    constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly skillRepository: SkillRepository
    ) {}

    public async registerUser(registerUserDTO: RegisterUserDTO): Promise<UserDTO> {
        const {
            password,
            email,
            firstName,
            lastName,
            jobTitle,
            jobDescription,
            directManager
            }: Partial<User> = registerUserDTO;

        await this.userRepository.matchEmail(email);
        
        const setDirectManager: User = await this.userRepository.findOne(
            { where: { email: directManager }}
            );

        const user = new User();

        user.salt = await bcrypt.genSalt();
        user.email = email;
        user.jobTitle = jobTitle;
        user.jobDescription = jobDescription;
        user.password = await this.passwordHash(password, user.salt);
        user.firstName = firstName;
        user.lastName = lastName;

        if (setDirectManager) {
            user.directManager = setDirectManager.email;
        }
        const registerdUser = await user.save();
    
           return plainToClass(UserDTO, registerdUser, { excludeExtraneousValues: true });
        }
    private async passwordHash(password: string, salt: string): Promise<string> {
        return bcrypt.hash(password, salt);
    }
    public async createEmployee(createEmployeeDTO: CreateEmployeeDTO): Promise<EmployeeDTO> {
        const { email, firstName, lastName, jobTitle, jobDescription, directManager, skillset } = createEmployeeDTO;

        const providedSkillNames: string[] = skillset.split(', ');

        const validSkills: Skill[] = [];

        for (const skillName of providedSkillNames) {
            let skillEntity = await this.skillRepository.findOne({
                where: { skillName: skillName }
            });
            if (skillEntity) {
                validSkills.push(skillEntity);
            }
        }

        await this.employeeRepository.matchEmail(email);

        const setDirectManager: User = await this.userRepository.findOne(
            { where: { email: directManager }}
            );

        const newEmployee = new Employee();

        newEmployee.email = email;
        newEmployee.jobTitle = jobTitle;
        newEmployee.jobDescription = jobDescription;
        newEmployee.firstName = firstName;
        newEmployee.lastName = lastName;
        newEmployee.skillset = validSkills;

        if (setDirectManager) {
        newEmployee.directManager = setDirectManager.email;
        }
        const createEmployee = await this.employeeRepository.save(newEmployee);
    
           return plainToClass(EmployeeDTO, createEmployee, { excludeExtraneousValues: true });
    }

    public async addNewSkillToCatalog(createSkillDTO: AddSkillDTO): Promise<SkillDTO> {
        const { skillName } = createSkillDTO;

        await this.skillRepository.matchExistingSkill(skillName);

        const skill = new Skill();

        skill.skillName = skillName;

        const addSkillToCatalog = await this.skillRepository.save(skill);

            return plainToClass(SkillDTO, addSkillToCatalog, { excludeExtraneousValues: true });
    }

    public async changeUserWorkPosition(userId: string): Promise<UserDTO> {
        const user: User = await this.userRepository.findOne(userId);

        if (user && user.position === 'manager') {
            user.position = WorkPosition.admin;
        } else if (user && user.position === 'admin') {
            user.position = WorkPosition.manager;
        }

        const updatedUser: User = await user.save();

            return plainToClass(UserDTO, updatedUser, { excludeExtraneousValues: true })
    }

    public async changeUserProfileInfo(userId: string, editUserInfo: EditUserDTO): Promise<UserDTO> {
        const {
            firstName,
            lastName,
            jobTitle,
            jobDescription
            }: Partial<User> = editUserInfo;

        const user: User = await this.userRepository.findOne(userId);

        if (user) {
            user.jobTitle = jobTitle;
            user.jobDescription = jobDescription;
            user.firstName = firstName;
            user.lastName = lastName;
        }
        const updatedUser = await user.save();
    
           return plainToClass(UserDTO, updatedUser, { excludeExtraneousValues: true });
    }

    public async changeEmployeeProfileInfo(employeeId: string, editEmployeeDTO: EditEmployeeDTO): Promise<EmployeeDTO> {
        const {
            firstName,
            lastName,
            jobTitle,
            jobDescription
            }: Partial<Employee> = editEmployeeDTO;

        const employee: Employee = await this.employeeRepository.findOne(employeeId);

        if (employee) {
            employee.jobTitle = jobTitle;
            employee.jobDescription = jobDescription;
            employee.firstName = firstName;
            employee.lastName = lastName;
        }
        const updatedEmployee = await employee.save();
        
           return plainToClass(EmployeeDTO, updatedEmployee, { excludeExtraneousValues: true });
    }

    public async changeUserManager(userId: string, editUserDTO: EditUserDTO): Promise<UserDTO> {
        const { directManager }: Partial<User> = editUserDTO;
        const user: User = await this.userRepository.findOne(userId);

        const newDirectManager: User = await this.userRepository.findOne(
            { where: { email: directManager }}
            );

        if (user) {
            if (newDirectManager) {
                user.directManager = newDirectManager.email
            }
        }
        const updatedUser = await user.save();
    
           return plainToClass(UserDTO, updatedUser, { excludeExtraneousValues: true });
    }

    public async changeEmployeeManager(employeeId: string, editEmployeeDTO: EditEmployeeDTO): Promise<EmployeeDTO> {
        const { directManager }: Partial<User> = editEmployeeDTO;
        const employee: Employee = await this.employeeRepository.findOne(employeeId);

        const newDirectManager: User = await this.userRepository.findOne(
            { where: { email: directManager }}
            );

        if (employee) {
            if (newDirectManager) {
                employee.directManager = newDirectManager.email
            }
        }
        const updatedEmployee = await employee.save();
    
           return plainToClass(EmployeeDTO, updatedEmployee, { excludeExtraneousValues: true });
    }

    public async addSkillToEmployeeSkillSet(employeeId: string, newSkills: AddSkillDTO): Promise<EmployeeDTO> {
        const employee: Employee = await this.employeeRepository.findOne(employeeId);

        const { skillName } = newSkills;
        const providedSkillNames: string[] = skillName.split(', ');

        const validSkills: Skill[] = [];

        for (const skillName of providedSkillNames) {
            let skillEntity = await this.skillRepository.findOne({
                where: { skillName: skillName }
            });
            if (skillEntity) {
                validSkills.push(skillEntity);
            }
        }

        if (!employee) {
            throw new BadRequestException(`Employee does not exist`)
        }

        employee.skillset = validSkills;

        const updatedEmployeeSkill = await employee.save();

            return plainToClass( EmployeeDTO, updatedEmployeeSkill, { excludeExtraneousValues: true });
    }

    public async updateUserProficePicture(userId: string, newAvatar: EditAvatarUserDTO): Promise<UserDTO> {
        const { avatarUrl } = newAvatar;

        const user = await this.userRepository.findOne(userId);

        if (!user) {
            throw new BadRequestException(`No manager found with these requirments`)
        }
        user.avatarUrl = avatarUrl;

        const updatedUser = await user.save();

        return plainToClass(UserDTO, updatedUser, { excludeExtraneousValues: true });
    }

    public async updateEmployeeProficePicture(employeeId: string, newAvatar: EditAvatarUserDTO): Promise<EmployeeDTO> {
        const { avatarUrl } = newAvatar;

        const employee: Employee = await this.employeeRepository.findOne(employeeId);

        if (!employee) {
            throw new BadRequestException(`No employee found  with these requirments`)
        }
        employee.avatarUrl = avatarUrl;

        const updatedEmployee = await employee.save();

        return plainToClass(EmployeeDTO, updatedEmployee, { excludeExtraneousValues: true });
    }

    public async deleteFile(imageName: string) {
        fs.unlink(path.join(__dirname, '../../src/uploads/', 'avatars/') + imageName,
        (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log('file deleted');
            }
        });
        
    }
}