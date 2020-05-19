import { Expose, Type } from "class-transformer";
import { Skill } from "src/database/entities/skill.entity";
import { SkillDTO } from "../skill/skill.dto";

export class EmployeeDTO {
    @Expose()
    id: string;

    @Expose()
    email: string;

    @Expose()
    firstName: string;

    @Expose()
    lastName: string;

    @Expose()
    jobTitle: string;

    @Expose()
    jobDescription: string;

    @Expose()
    registered: Date;

    @Expose()
    updated: Date;
 
    @Expose()
    directManager: string;

    @Expose()
    @Type(() => SkillDTO)
    public skillset: SkillDTO;
  }