import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

export function ApiController(name: string){
    return function(target: any){
        ApiTags(name)(target);
        Controller()(target);
    }
}