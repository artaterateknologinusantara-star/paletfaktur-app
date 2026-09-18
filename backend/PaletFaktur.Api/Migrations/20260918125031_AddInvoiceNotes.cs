using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PaletFaktur.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Invoices");
        }
    }
}
