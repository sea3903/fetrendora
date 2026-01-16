export class UpdateUserDTO {
    fullname?: string;
    address?: string;
    password?: string;
    retype_password?: string;
    current_password?: string;
    date_of_birth?: Date;
    phone_number?: string;
    facebook_account_id?: string;
    google_account_id?: string;

    constructor(data: any) {
        this.fullname = data.fullname;
        this.address = data.address;
        this.password = data.password;
        this.retype_password = data.retype_password;
        this.current_password = data.current_password;
        this.date_of_birth = data.date_of_birth;
        this.phone_number = data.phone_number;
        this.facebook_account_id = data.facebook_account_id;
        this.google_account_id = data.google_account_id;
    }
}