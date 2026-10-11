import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsService } from "./departments.service";
import { PositionsController } from "./positions.controller";
import { PositionsService } from "./positions.service";
import { PositionRequiredEpisController } from "./position-required-epis.controller";
import { PositionRequiredEpisService } from "./position-required-epis.service";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { EmployeesImportController } from "./employees-import.controller";
import { EmployeesImportService } from "./employees-import.service";
import { EmployeeDocumentsController } from "./employee-documents.controller";
import { EmployeeDocumentsService } from "./employee-documents.service";

@Module({
  controllers: [
    CompaniesController,
    BranchesController,
    UnitsController,
    DepartmentsController,
    PositionsController,
    PositionRequiredEpisController,
    EmployeesController,
    UsersController,
    EmployeesImportController,
    EmployeeDocumentsController,
  ],
  providers: [
    CompaniesService,
    BranchesService,
    UnitsService,
    DepartmentsService,
    PositionsService,
    PositionRequiredEpisService,
    EmployeesService,
    UsersService,
    EmployeesImportService,
    EmployeeDocumentsService,
  ],
})
export class OrgModule {}
