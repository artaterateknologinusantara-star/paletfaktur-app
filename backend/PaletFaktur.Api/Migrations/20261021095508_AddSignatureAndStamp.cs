using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PaletFaktur.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSignatureAndStamp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SignatureUrl",
                table: "CompanySettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StampUrl",
                table: "CompanySettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "CompanySettings",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "SignatureUrl", "StampUrl" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SignatureUrl",
                table: "CompanySettings");

            migrationBuilder.DropColumn(
                name: "StampUrl",
                table: "CompanySettings");
        }
    }
}
