import { Module } from "@nestjs/common";
import { Nr01Controller } from "./nr01.controller";
import { Nr01Service } from "./nr01.service";

@Module({
  controllers: [Nr01Controller],
  providers: [Nr01Service],
})
export class Nr01Module {}
