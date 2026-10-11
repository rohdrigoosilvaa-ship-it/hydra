import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EmployeesImportService } from "./employees-import.service";
import { ConfirmImportDto } from "./dto/employees-import.dto";

@Controller("employees/import")
export class EmployeesImportController {
  constructor(private readonly importService: EmployeesImportService) {}

  @Post("preview")
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_WRITE)
  @UseInterceptors(FileInterceptor("file"))
  async preview(@CurrentUser() user: HydraRequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Envie um arquivo .xlsx.");
    const { rows, headerFound, missingColumns } = this.importService.parseFile(file.buffer);
    if (!headerFound) {
      throw new BadRequestException(
        'Não encontrei as colunas "Nome" e "CPF" na planilha — confira se é o arquivo certo.',
      );
    }
    if (missingColumns.length > 0) {
      throw new BadRequestException(`Colunas ausentes na planilha: ${missingColumns.join(", ")}.`);
    }
    return this.importService.preview(user.tenantId, user.assignments, rows, file.originalname);
  }

  @Post("confirm")
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_WRITE)
  async confirm(@CurrentUser() user: HydraRequestUser, @Body() dto: ConfirmImportDto) {
    return this.importService.confirm(user.tenantId, user.assignments, dto.rows, user.id, dto.fileName);
  }
}
